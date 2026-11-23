import db from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

// URL validator for OneDrive links
const isValidOneDriveUrl = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes('1drv.ms') ||
      host.includes('onedrive') ||
      host.includes('sharepoint.com') ||
      host.includes('live.com')
    );
  } catch (e) {
    return false;
  }
};

/**
 * Create Assignment
 * - Admin only
 * - Allocates to all students (group_id = NULL) or specific groups
 * - Validates OneDrive URL, due_date, title
 * - Uses SQL transaction
 */
export const createAssignment = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { title, description, due_date, onedrive_link, allocation_type, group_ids } = req.body;
    const adminId = req.user.id;

    // 1. Validation
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return sendError(res, 'Assignment title must be at least 3 characters long.', 400);
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return sendError(res, 'Assignment description must be at least 5 characters long.', 400);
    }

    if (!due_date || isNaN(Date.parse(due_date))) {
      return sendError(res, 'Please provide a valid due date.', 400);
    }

    if (!onedrive_link || !isValidOneDriveUrl(onedrive_link)) {
      return sendError(
        res,
        'Please provide a valid OneDrive submission URL (e.g. from 1drv.ms, onedrive.live.com, or sharepoint.com).',
        400
      );
    }

    const isAllStudents = allocation_type === 'all' || !group_ids || group_ids.length === 0;

    // If allocated to specific groups, validate groups exist
    let uniqueGroupIds = [];
    if (!isAllStudents) {
      if (!Array.isArray(group_ids) || group_ids.length === 0) {
        return sendError(res, 'Please select at least one group for group-specific allocation.', 400);
      }

      uniqueGroupIds = [...new Set(group_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id)))];
      if (uniqueGroupIds.length === 0) {
        return sendError(res, 'No valid group IDs provided.', 400);
      }

      const existingGroups = await client.query(
        'SELECT id FROM groups WHERE id = ANY($1::int[])',
        [uniqueGroupIds]
      );

      if (existingGroups.rows.length !== uniqueGroupIds.length) {
        return sendError(res, 'One or more selected groups do not exist.', 400);
      }
    }

    // 2. Transaction
    await client.query('BEGIN');

    const insertAssignRes = await client.query(
      `INSERT INTO assignments (title, description, due_date, onedrive_link, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, due_date, onedrive_link, created_by, created_at, updated_at`,
      [title.trim(), description.trim(), new Date(due_date), onedrive_link.trim(), adminId]
    );

    const newAssignment = insertAssignRes.rows[0];

    // 3. Allocation insertion
    let allocatedGroupsList = [];
    if (isAllStudents) {
      await client.query(
        `INSERT INTO assignment_groups (assignment_id, group_id)
         VALUES ($1, NULL)`,
        [newAssignment.id]
      );
    } else {
      for (const gid of uniqueGroupIds) {
        await client.query(
          `INSERT INTO assignment_groups (assignment_id, group_id)
           VALUES ($1, $2)`,
          [newAssignment.id, gid]
        );
      }

      const gRes = await client.query(
        'SELECT id, name, group_code FROM groups WHERE id = ANY($1::int[])',
        [uniqueGroupIds]
      );
      allocatedGroupsList = gRes.rows;
    }

    await client.query('COMMIT');

    return sendSuccess(res, 'Assignment created successfully.', {
      assignment: {
        ...newAssignment,
        allocation_type: isAllStudents ? 'all' : 'groups',
        allocated_groups: allocatedGroupsList,
        created_by_name: req.user.name
      }
    }, 201);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get Assignments
 * - Admin: sees all assignments, allocation info, submission counts
 * - Student: sees assignments for all students OR for their active group only
 */
export const getAssignments = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'admin') {
      const assignmentsRes = await db.query(
        `SELECT a.id, a.title, a.description, a.due_date, a.onedrive_link,
                a.created_by, a.created_at, a.updated_at,
                u.name as creator_name,
                CASE WHEN EXISTS (
                  SELECT 1 FROM assignment_groups ag WHERE ag.assignment_id = a.id AND ag.group_id IS NULL
                ) THEN 'all' ELSE 'groups' END as allocation_type,
                (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id) as submissions_count
         FROM assignments a
         JOIN users u ON a.created_by = u.id
         ORDER BY a.created_at DESC`
      );

      // Attach allocated groups for each assignment
      const assignmentsWithGroups = await Promise.all(
        assignmentsRes.rows.map(async (assign) => {
          if (assign.allocation_type === 'groups') {
            const gRes = await db.query(
              `SELECT g.id, g.name, g.group_code 
               FROM assignment_groups ag 
               JOIN groups g ON ag.group_id = g.id 
               WHERE ag.assignment_id = $1`,
              [assign.id]
            );
            return { ...assign, allocated_groups: gRes.rows };
          }
          return { ...assign, allocated_groups: [] };
        })
      );

      return sendSuccess(res, 'All assignments retrieved.', {
        assignments: assignmentsWithGroups
      });
    }

    // Student Role: determine their active group
    const memberRes = await db.query(
      'SELECT group_id FROM group_members WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    const studentGroupId = memberRes.rows.length > 0 ? memberRes.rows[0].group_id : null;

    const studentAssignmentsRes = await db.query(
      `SELECT DISTINCT a.id, a.title, a.description, a.due_date, a.onedrive_link,
              a.created_at, a.updated_at,
              CASE WHEN ag.group_id IS NULL THEN 'all' ELSE 'group_specific' END as allocation_type,
              s.id as submission_id,
              s.confirmed_at as submitted_at,
              sub_u.name as confirmed_by_name,
              CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted,
              CASE WHEN s.id IS NULL AND a.due_date < NOW() THEN true ELSE false END as is_overdue
       FROM assignments a
       JOIN assignment_groups ag ON a.id = ag.assignment_id
       LEFT JOIN submissions s ON a.id = s.assignment_id AND s.group_id = $1::int
       LEFT JOIN users sub_u ON s.confirmed_by = sub_u.id
       WHERE ag.group_id IS NULL
          OR ($1::int IS NOT NULL AND ag.group_id = $1::int)
       ORDER BY a.due_date ASC`,
      [studentGroupId]
    );

    return sendSuccess(res, 'Student assignments retrieved.', {
      assignments: studentAssignmentsRes.rows,
      group_id: studentGroupId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Assignment by ID
 * - Admin: sees full details, submission list
 * - Student: sees details only if allocated to all or their group
 */
export const getAssignmentById = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const user = req.user;

    if (isNaN(assignmentId)) {
      return sendError(res, 'Invalid assignment ID parameter.', 400);
    }

    // 1. Fetch assignment
    const assignRes = await db.query(
      `SELECT a.id, a.title, a.description, a.due_date, a.onedrive_link,
              a.created_by, a.created_at, a.updated_at,
              u.name as creator_name
       FROM assignments a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [assignmentId]
    );

    if (assignRes.rows.length === 0) {
      return sendError(res, 'Assignment not found.', 404);
    }

    const assignment = assignRes.rows[0];

    // 2. Fetch allocation info
    const allocRes = await db.query(
      `SELECT ag.group_id, g.name as group_name, g.group_code
       FROM assignment_groups ag
       LEFT JOIN groups g ON ag.group_id = g.id
       WHERE ag.assignment_id = $1`,
      [assignmentId]
    );

    const isAllStudents = allocRes.rows.some(r => r.group_id === null);
    const allocatedGroups = allocRes.rows.filter(r => r.group_id !== null).map(r => ({
      id: r.group_id,
      name: r.group_name,
      group_code: r.group_code
    }));

    // 3. Authorization for student
    let studentSubmission = null;
    let studentGroupId = null;

    if (user.role !== 'admin') {
      const memberRes = await db.query(
        'SELECT group_id FROM group_members WHERE user_id = $1 LIMIT 1',
        [user.id]
      );
      studentGroupId = memberRes.rows.length > 0 ? memberRes.rows[0].group_id : null;

      const isAllocated = isAllStudents || (studentGroupId && allocatedGroups.some(g => g.id === studentGroupId));
      if (!isAllocated) {
        return sendError(res, 'Forbidden: You are not authorized to view this assignment.', 403);
      }

      if (studentGroupId) {
        const subRes = await db.query(
          `SELECT s.id, s.confirmed_at, u.name as confirmed_by_name
           FROM submissions s
           JOIN users u ON s.confirmed_by = u.id
           WHERE s.assignment_id = $1 AND s.group_id = $2`,
          [assignmentId, studentGroupId]
        );
        if (subRes.rows.length > 0) {
          studentSubmission = subRes.rows[0];
        }
      }
    }

    // If Admin, also retrieve group submission statuses
    let adminSubmissions = [];
    if (user.role === 'admin') {
      const subRes = await db.query(
        `SELECT s.id, s.group_id, g.name as group_name, g.group_code,
                s.confirmed_by, u.name as confirmed_by_name, s.confirmed_at
         FROM submissions s
         JOIN groups g ON s.group_id = g.id
         JOIN users u ON s.confirmed_by = u.id
         WHERE s.assignment_id = $1
         ORDER BY s.confirmed_at DESC`,
        [assignmentId]
      );
      adminSubmissions = subRes.rows;
    }

    return sendSuccess(res, 'Assignment details retrieved.', {
      assignment: {
        ...assignment,
        allocation_type: isAllStudents ? 'all' : 'groups',
        allocated_groups: allocatedGroups,
        ...(user.role === 'admin' ? { submissions: adminSubmissions } : {
          submission: studentSubmission,
          is_submitted: !!studentSubmission,
          is_overdue: !studentSubmission && new Date(assignment.due_date) < new Date()
        })
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit Assignment
 * - Admin only
 * - Can update title, description, due_date, onedrive_link, allocation
 */
export const updateAssignment = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const { title, description, due_date, onedrive_link, allocation_type, group_ids } = req.body;

    if (isNaN(assignmentId)) {
      return sendError(res, 'Invalid assignment ID parameter.', 400);
    }

    // 1. Verify existence
    const checkRes = await client.query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
    if (checkRes.rows.length === 0) {
      return sendError(res, 'Assignment not found.', 404);
    }

    const current = checkRes.rows[0];

    // 2. Validate updates
    let updatedTitle = current.title;
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        return sendError(res, 'Title must be at least 3 characters long.', 400);
      }
      updatedTitle = title.trim();
    }

    let updatedDesc = current.description;
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 5) {
        return sendError(res, 'Description must be at least 5 characters long.', 400);
      }
      updatedDesc = description.trim();
    }

    let updatedDueDate = current.due_date;
    if (due_date !== undefined) {
      if (isNaN(Date.parse(due_date))) {
        return sendError(res, 'Invalid due date format.', 400);
      }
      updatedDueDate = new Date(due_date);
    }

    let updatedLink = current.onedrive_link;
    if (onedrive_link !== undefined) {
      if (!isValidOneDriveUrl(onedrive_link)) {
        return sendError(res, 'Invalid OneDrive submission URL.', 400);
      }
      updatedLink = onedrive_link.trim();
    }

    await client.query('BEGIN');

    // 3. Update assignment table
    const updateRes = await client.query(
      `UPDATE assignments
       SET title = $1, description = $2, due_date = $3, onedrive_link = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, title, description, due_date, onedrive_link, created_by, created_at, updated_at`,
      [updatedTitle, updatedDesc, updatedDueDate, updatedLink, assignmentId]
    );

    // 4. Update allocation if provided
    if (allocation_type !== undefined || group_ids !== undefined) {
      const isAllStudents = allocation_type === 'all' || !group_ids || group_ids.length === 0;

      // Remove existing allocations
      await client.query('DELETE FROM assignment_groups WHERE assignment_id = $1', [assignmentId]);

      if (isAllStudents) {
        await client.query(
          'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, NULL)',
          [assignmentId]
        );
      } else {
        const uniqueGroupIds = [...new Set(group_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id)))];
        for (const gid of uniqueGroupIds) {
          await client.query(
            'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)',
            [assignmentId, gid]
          );
        }
      }
    }

    await client.query('COMMIT');

    return sendSuccess(res, 'Assignment updated successfully.', {
      assignment: updateRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Delete Assignment
 * - Admin only
 * - Handled safely with ON DELETE CASCADE foreign keys
 */
export const deleteAssignment = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);

    if (isNaN(assignmentId)) {
      return sendError(res, 'Invalid assignment ID parameter.', 400);
    }

    const checkRes = await db.query('SELECT id, title FROM assignments WHERE id = $1', [assignmentId]);
    if (checkRes.rows.length === 0) {
      return sendError(res, 'Assignment not found.', 404);
    }

    await db.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);

    return sendSuccess(res, `Assignment "${checkRes.rows[0].title}" was successfully deleted.`);
  } catch (error) {
    next(error);
  }
};