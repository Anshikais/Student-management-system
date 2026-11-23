import db from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Confirm Assignment Submission
 * - POST /api/submissions/confirm
 * - Authenticated student only
 * - Student must belong to specified group
 * - Student MUST be the group leader
 * - Assignment must be allocated to all students or this group
 * - Duplicate submissions prevented (409)
 */
export const confirmSubmission = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { assignment_id, group_id } = req.body;
    const user = req.user;

    const assignId = parseInt(assignment_id, 10);
    let groupId = parseInt(group_id, 10);

    if (isNaN(assignId)) {
      return sendError(res, 'Please provide a valid assignment ID.', 400);
    }

    // 1. Determine and verify student group membership
    const memberRes = await client.query(
      `SELECT gm.group_id, g.name as group_name, g.leader_id
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = $1`,
      [user.id]
    );

    if (memberRes.rows.length === 0) {
      return sendError(res, 'You must belong to an active group to confirm an assignment submission.', 403);
    }

    const userGroup = memberRes.rows[0];

    // If group_id was specified in request, ensure it matches student's group
    if (!isNaN(groupId) && groupId !== userGroup.group_id) {
      return sendError(res, 'Forbidden: You cannot confirm submissions for another group.', 403);
    }
    groupId = userGroup.group_id;

    // 2. Enforce Group Leader Only Policy
    if (userGroup.leader_id !== user.id) {
      return sendError(
        res,
        'Forbidden: Only the group leader can confirm assignment submission for the group.',
        403
      );
    }

    // 3. Verify Assignment exists
    const assignRes = await client.query(
      'SELECT id, title, due_date FROM assignments WHERE id = $1',
      [assignId]
    );

    if (assignRes.rows.length === 0) {
      return sendError(res, 'Assignment not found.', 404);
    }

    // 4. Verify assignment is allocated to this group or all students
    const allocRes = await client.query(
      `SELECT id FROM assignment_groups
       WHERE assignment_id = $1 AND (group_id IS NULL OR group_id = $2)`,
      [assignId, groupId]
    );

    if (allocRes.rows.length === 0) {
      return sendError(res, 'This assignment is not allocated to your group.', 400);
    }

    // 5. Check for duplicate submission
    const existingSub = await client.query(
      'SELECT id, confirmed_at FROM submissions WHERE assignment_id = $1 AND group_id = $2',
      [assignId, groupId]
    );

    if (existingSub.rows.length > 0) {
      return sendError(
        res,
        'Submission has already been confirmed for this assignment and group.',
        409
      );
    }

    // 6. Record submission inside transaction
    await client.query('BEGIN');

    const insertRes = await client.query(
      `INSERT INTO submissions (assignment_id, group_id, confirmed_by, confirmed_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, assignment_id, group_id, confirmed_by, confirmed_at`,
      [assignId, groupId, user.id]
    );

    await client.query('COMMIT');

    const submission = insertRes.rows[0];

    return sendSuccess(res, 'Assignment submission successfully confirmed.', {
      submission: {
        ...submission,
        assignment_title: assignRes.rows[0].title,
        group_name: userGroup.group_name,
        confirmed_by_name: user.name
      }
    }, 201);
  } catch (error) {
    await client.query('ROLLBACK');
    // Guard against unique constraint violation race conditions
    if (error.code === '23505') {
      return sendError(res, 'Submission has already been confirmed for this assignment.', 409);
    }
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get Submissions List
 * - Admin: sees all submissions
 * - Student: sees submissions for their group only
 */
export const getSubmissions = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'admin') {
      const allSubmissions = await db.query(
        `SELECT s.id, s.assignment_id, s.group_id, s.confirmed_by, s.confirmed_at,
                a.title as assignment_title, a.due_date,
                g.name as group_name, g.group_code,
                u.name as confirmed_by_name, u.email as confirmed_by_email, u.student_id as confirmed_by_student_id,
                CASE WHEN s.confirmed_at > a.due_date THEN true ELSE false END as is_late
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN groups g ON s.group_id = g.id
         JOIN users u ON s.confirmed_by = u.id
         ORDER BY s.confirmed_at DESC`
      );

      return sendSuccess(res, 'All submissions retrieved.', {
        submissions: allSubmissions.rows
      });
    }

    // Student: find active group
    const memberRes = await db.query(
      'SELECT group_id FROM group_members WHERE user_id = $1 LIMIT 1',
      [user.id]
    );

    if (memberRes.rows.length === 0) {
      return sendSuccess(res, 'No submissions found.', { submissions: [] });
    }

    const groupId = memberRes.rows[0].group_id;

    const groupSubmissions = await db.query(
      `SELECT s.id, s.assignment_id, s.group_id, s.confirmed_by, s.confirmed_at,
              a.title as assignment_title, a.due_date,
              u.name as confirmed_by_name,
              CASE WHEN s.confirmed_at > a.due_date THEN true ELSE false END as is_late
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN users u ON s.confirmed_by = u.id
       WHERE s.group_id = $1
       ORDER BY s.confirmed_at DESC`,
      [groupId]
    );

    return sendSuccess(res, 'Group submissions retrieved.', {
      submissions: groupSubmissions.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Progress Metrics
 * - Student: group metrics (total, completed, pending, overdue, percentage)
 * - Admin: system-wide metrics across all groups
 */
export const getProgress = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'admin') {
      // Admin overall progress calculation
      const totalGroupsRes = await db.query('SELECT COUNT(*)::int as count FROM groups');
      const totalAssignmentsRes = await db.query('SELECT COUNT(*)::int as count FROM assignments');
      const totalStudentsRes = await db.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'student'");

      const totalGroups = totalGroupsRes.rows[0].count;
      const totalAssignments = totalAssignmentsRes.rows[0].count;
      const totalStudents = totalStudentsRes.rows[0].count;

      // Calculate progress per group
      const groupsRes = await db.query(
        `SELECT g.id, g.name, g.group_code, u.name as leader_name,
                COUNT(DISTINCT a.id)::int as total_assigned,
                COUNT(DISTINCT s.assignment_id)::int as completed_count
         FROM groups g
         JOIN users u ON g.leader_id = u.id
         LEFT JOIN assignment_groups ag ON (ag.group_id IS NULL OR ag.group_id = g.id)
         LEFT JOIN assignments a ON ag.assignment_id = a.id
         LEFT JOIN submissions s ON (s.assignment_id = a.id AND s.group_id = g.id)
         GROUP BY g.id, g.name, g.group_code, u.name
         ORDER BY g.name ASC`
      );

      let completedGroupsCount = 0;
      let pendingGroupsCount = 0;
      let totalEligiblePairs = 0;
      let totalCompletedSubmissions = 0;

      const groupBreakdown = groupsRes.rows.map(g => {
        const total = g.total_assigned || 0;
        const completed = g.completed_count || 0;
        const pending = Math.max(0, total - completed);
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        totalEligiblePairs += total;
        totalCompletedSubmissions += completed;

        if (total > 0 && completed === total) {
          completedGroupsCount++;
        } else if (total > 0) {
          pendingGroupsCount++;
        }

        return {
          id: g.id,
          name: g.name,
          group_code: g.group_code,
          leader_name: g.leader_name,
          total_assigned: total,
          completed: completed,
          pending: pending,
          progress_percentage: percent,
          is_completed: total > 0 && completed === total
        };
      });

      const overallPercentage = totalEligiblePairs > 0 
        ? Math.round((totalCompletedSubmissions / totalEligiblePairs) * 100) 
        : 0;

      return sendSuccess(res, 'Admin progress analytics retrieved.', {
        total_assignments: totalAssignments,
        total_groups: totalGroups,
        total_students: totalStudents,
        completed_groups: completedGroupsCount,
        pending_groups: pendingGroupsCount,
        overall_progress_percentage: overallPercentage,
        groups: groupBreakdown
      });
    }

    // Student Role: active group progress
    const memberRes = await db.query(
      'SELECT group_id FROM group_members WHERE user_id = $1 LIMIT 1',
      [user.id]
    );

    if (memberRes.rows.length === 0) {
      return sendSuccess(res, 'No active group.', {
        total_assignments: 0,
        completed_assignments: 0,
        pending_assignments: 0,
        overdue_assignments: 0,
        progress_percentage: 0,
        group: null
      });
    }

    const groupId = memberRes.rows[0].group_id;

    // Get all assignments assigned to this student's group
    const assignRes = await db.query(
      `SELECT DISTINCT a.id, a.due_date,
              CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted,
              CASE WHEN s.id IS NULL AND a.due_date < NOW() THEN true ELSE false END as is_overdue
       FROM assignments a
       JOIN assignment_groups ag ON a.id = ag.assignment_id
       LEFT JOIN submissions s ON a.id = s.assignment_id AND s.group_id = $1
       WHERE ag.group_id IS NULL OR ag.group_id = $1`,
      [groupId]
    );

    const total = assignRes.rows.length;
    const completed = assignRes.rows.filter(r => r.is_submitted).length;
    const pending = total - completed;
    const overdue = assignRes.rows.filter(r => r.is_overdue).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return sendSuccess(res, 'Student group progress retrieved.', {
      group_id: groupId,
      total_assignments: total,
      completed_assignments: completed,
      pending_assignments: pending,
      overdue_assignments: overdue,
      progress_percentage: percentage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Submissions by Assignment ID
 * - Admin or authorized student:
 * - Returns eligible groups and their submission status
 */
export const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const user = req.user;

    if (isNaN(assignmentId)) {
      return sendError(res, 'Invalid assignment ID parameter.', 400);
    }

    // Verify assignment exists
    const assignCheck = await db.query('SELECT id, title FROM assignments WHERE id = $1', [assignmentId]);
    if (assignCheck.rows.length === 0) {
      return sendError(res, 'Assignment not found.', 404);
    }

    // Determine eligible groups (all groups if group_id is NULL, or specific groups)
    const allocRes = await db.query(
      'SELECT group_id FROM assignment_groups WHERE assignment_id = $1',
      [assignmentId]
    );

    const isAll = allocRes.rows.some(r => r.group_id === null);
    const specificGids = allocRes.rows.filter(r => r.group_id !== null).map(r => r.group_id);

    // If student, ensure they belong to an eligible group
    if (user.role !== 'admin') {
      const memberRes = await db.query(
        'SELECT group_id FROM group_members WHERE user_id = $1 LIMIT 1',
        [user.id]
      );
      const studentGroupId = memberRes.rows.length > 0 ? memberRes.rows[0].group_id : null;
      if (!isAll && (!studentGroupId || !specificGids.includes(studentGroupId))) {
        return sendError(res, 'Forbidden: You are not authorized to view this assignment data.', 403);
      }
    }

    // Query eligible groups and their submission info
    let groupsQuery;
    let queryParams;

    if (isAll) {
      groupsQuery = `
        SELECT g.id as group_id, g.name as group_name, g.group_code,
               u.name as leader_name,
               s.id as submission_id, s.confirmed_at,
               sub_u.name as confirmed_by_name,
               CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted
        FROM groups g
        JOIN users u ON g.leader_id = u.id
        LEFT JOIN submissions s ON (s.assignment_id = $1 AND s.group_id = g.id)
        LEFT JOIN users sub_u ON s.confirmed_by = sub_u.id
        ORDER BY is_submitted DESC, g.name ASC
      `;
      queryParams = [assignmentId];
    } else {
      groupsQuery = `
        SELECT g.id as group_id, g.name as group_name, g.group_code,
               u.name as leader_name,
               s.id as submission_id, s.confirmed_at,
               sub_u.name as confirmed_by_name,
               CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted
        FROM groups g
        JOIN users u ON g.leader_id = u.id
        LEFT JOIN submissions s ON (s.assignment_id = $1 AND s.group_id = g.id)
        LEFT JOIN users sub_u ON s.confirmed_by = sub_u.id
        WHERE g.id = ANY($2::int[])
        ORDER BY is_submitted DESC, g.name ASC
      `;
      queryParams = [assignmentId, specificGids];
    }

    const result = await db.query(groupsQuery, queryParams);

    const totalEligible = result.rows.length;
    const submittedCount = result.rows.filter(r => r.is_submitted).length;
    const pendingCount = totalEligible - submittedCount;
    const percentage = totalEligible > 0 ? Math.round((submittedCount / totalEligible) * 100) : 0;

    return sendSuccess(res, 'Assignment group submission status retrieved.', {
      assignment_id: assignmentId,
      assignment_title: assignCheck.rows[0].title,
      total_eligible_groups: totalEligible,
      submitted_groups: submittedCount,
      pending_groups: pendingCount,
      completion_percentage: percentage,
      groups: result.rows
    });
  } catch (error) {
    next(error);
  }
};