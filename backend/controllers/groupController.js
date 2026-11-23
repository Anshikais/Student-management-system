import crypto from 'crypto';
import db from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

// Helper to generate a clean, unique group code (e.g. GRP-A9X2B)
const generateGroupCode = () => {
  return 'GRP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

/**
 * Create a new group
 * - Authenticated student only
 * - Student becomes leader automatically
 * - Student cannot belong to multiple groups
 * - Uses SQL transaction
 */
export const createGroup = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 3) {
      return sendError(res, 'Group name must be at least 3 characters long.', 400);
    }

    if (name.trim().length > 100) {
      return sendError(res, 'Group name cannot exceed 100 characters.', 400);
    }

    // 1. Verify caller doesn't already belong to an active group
    const existingMembership = await client.query(
      `SELECT gm.group_id, g.name as group_name 
       FROM group_members gm 
       JOIN groups g ON gm.group_id = g.id 
       WHERE gm.user_id = $1`,
      [userId]
    );

    if (existingMembership.rows.length > 0) {
      return sendError(
        res,
        `You are already a member of group "${existingMembership.rows[0].group_name}". Students can only belong to one active group.`,
        400
      );
    }

    // 2. Generate unique group code with collision prevention
    let groupCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      groupCode = generateGroupCode();
      const codeCheck = await client.query('SELECT id FROM groups WHERE group_code = $1', [groupCode]);
      if (codeCheck.rows.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return sendError(res, 'Failed to generate unique group code. Please try again.', 500);
    }

    // 3. Execute Transaction
    await client.query('BEGIN');

    const createGroupRes = await client.query(
      `INSERT INTO groups (name, group_code, leader_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, group_code, leader_id, created_at`,
      [name.trim(), groupCode, userId]
    );

    const newGroup = createGroupRes.rows[0];

    // Auto-add leader to group_members
    await client.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [newGroup.id, userId]
    );

    await client.query('COMMIT');

    return sendSuccess(res, 'Group created successfully.', {
      group: {
        id: newGroup.id,
        name: newGroup.name,
        group_code: newGroup.group_code,
        leader_id: newGroup.leader_id,
        leader_name: req.user.name,
        leader_email: req.user.email,
        is_leader: true,
        created_at: newGroup.created_at,
        members: [
          {
            user_id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            student_id: req.user.student_id,
            is_leader: true,
            joined_at: newGroup.created_at
          }
        ]
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
 * Get groups
 * - Admin: returns all groups with member count and leader info
 * - Student: returns user's active group details with member list
 */
export const getGroups = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'admin') {
      const groupsRes = await db.query(
        `SELECT g.id, g.name, g.group_code, g.leader_id, g.created_at,
                u.name as leader_name, u.email as leader_email, u.student_id as leader_student_id,
                COUNT(gm.id)::int as member_count
         FROM groups g
         JOIN users u ON g.leader_id = u.id
         LEFT JOIN group_members gm ON g.id = gm.group_id
         GROUP BY g.id, u.name, u.email, u.student_id
         ORDER BY g.created_at DESC`
      );

      return sendSuccess(res, 'All groups retrieved.', {
        groups: groupsRes.rows
      });
    }

    // If student, get their active group
    const membershipRes = await db.query(
      `SELECT group_id FROM group_members WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );

    if (membershipRes.rows.length === 0) {
      return sendSuccess(res, 'User is not currently in any group.', {
        group: null
      });
    }

    const groupId = membershipRes.rows[0].group_id;

    // Fetch full group details
    const groupRes = await db.query(
      `SELECT g.id, g.name, g.group_code, g.leader_id, g.created_at,
              u.name as leader_name, u.email as leader_email,
              CASE WHEN g.leader_id = $1 THEN true ELSE false END as is_leader
       FROM groups g
       JOIN users u ON g.leader_id = u.id
       WHERE g.id = $2`,
      [user.id, groupId]
    );

    const membersRes = await db.query(
      `SELECT gm.id as membership_id, gm.joined_at,
              u.id as user_id, u.name, u.email, u.student_id,
              CASE WHEN u.id = g.leader_id THEN true ELSE false END as is_leader
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.group_id = $1
       ORDER BY is_leader DESC, gm.joined_at ASC`,
      [groupId]
    );

    const groupData = {
      ...groupRes.rows[0],
      members: membersRes.rows
    };

    return sendSuccess(res, 'Active group retrieved.', {
      group: groupData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get group by ID
 * - Admin can view any group
 * - Students can only view their own group
 */
export const getGroupById = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const user = req.user;

    if (isNaN(groupId)) {
      return sendError(res, 'Invalid group ID parameter.', 400);
    }

    // 1. Fetch group base info
    const groupRes = await db.query(
      `SELECT g.id, g.name, g.group_code, g.leader_id, g.created_at,
              u.name as leader_name, u.email as leader_email
       FROM groups g
       JOIN users u ON g.leader_id = u.id
       WHERE g.id = $1`,
      [groupId]
    );

    if (groupRes.rows.length === 0) {
      return sendError(res, 'Group not found.', 404);
    }

    const group = groupRes.rows[0];

    // 2. Authorization check
    if (user.role !== 'admin') {
      const isMember = await db.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, user.id]
      );

      if (isMember.rows.length === 0) {
        return sendError(res, 'Forbidden: You are not authorized to view this group.', 403);
      }
    }

    // 3. Fetch members
    const membersRes = await db.query(
      `SELECT gm.id as membership_id, gm.joined_at,
              u.id as user_id, u.name, u.email, u.student_id,
              CASE WHEN u.id = $2 THEN true ELSE false END as is_leader
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY is_leader DESC, gm.joined_at ASC`,
      [groupId, group.leader_id]
    );

    return sendSuccess(res, 'Group details retrieved.', {
      group: {
        ...group,
        is_leader: group.leader_id === user.id,
        members: membersRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add member to group
 * - Only group leader (or admin) can add members
 * - Can search by email or student ID
 * - Target must exist and have role 'student'
 * - Target must not belong to any active group
 */
export const addMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const { identifier } = req.body;
    const caller = req.user;

    if (isNaN(groupId)) {
      return sendError(res, 'Invalid group ID parameter.', 400);
    }

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return sendError(res, 'Please provide student email or student ID to add.', 400);
    }

    // 1. Fetch group to verify existence and leader permission
    const groupRes = await db.query(
      'SELECT id, name, leader_id FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupRes.rows.length === 0) {
      return sendError(res, 'Group not found.', 404);
    }

    const group = groupRes.rows[0];

    // Only leader or admin can add members
    if (caller.role !== 'admin' && group.leader_id !== caller.id) {
      return sendError(res, 'Forbidden: Only the group leader can add members.', 403);
    }

    // 2. Find target user by email or student_id
    const targetQuery = identifier.trim();
    const userRes = await db.query(
      `SELECT id, name, email, student_id, role 
       FROM users 
       WHERE LOWER(email) = LOWER($1) OR UPPER(student_id) = UPPER($1)`,
      [targetQuery]
    );

    if (userRes.rows.length === 0) {
      return sendError(res, `No registered student found with identifier "${targetQuery}".`, 404);
    }

    const targetUser = userRes.rows[0];

    if (targetUser.role !== 'student') {
      return sendError(res, 'Only students can be added to a group.', 400);
    }

    // 3. Verify target student does not already belong to an active group
    const existingMembership = await db.query(
      `SELECT gm.group_id, g.name as group_name 
       FROM group_members gm 
       JOIN groups g ON gm.group_id = g.id 
       WHERE gm.user_id = $1`,
      [targetUser.id]
    );

    if (existingMembership.rows.length > 0) {
      if (existingMembership.rows[0].group_id === groupId) {
        return sendError(res, `${targetUser.name} is already a member of this group.`, 409);
      }
      return sendError(
        res,
        `${targetUser.name} is already a member of another group ("${existingMembership.rows[0].group_name}"). Students cannot belong to multiple groups.`,
        409
      );
    }

    // 4. Add target user to group
    const insertRes = await db.query(
      `INSERT INTO group_members (group_id, user_id) 
       VALUES ($1, $2) 
       RETURNING id, joined_at`,
      [groupId, targetUser.id]
    );

    return sendSuccess(res, `Student ${targetUser.name} added to the group successfully.`, {
      member: {
        membership_id: insertRes.rows[0].id,
        user_id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        student_id: targetUser.student_id,
        is_leader: false,
        joined_at: insertRes.rows[0].joined_at
      }
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from group
 * - Only group leader can remove members
 * - Group leader cannot remove themselves
 * - Target user must be a member of the group
 */
export const removeMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    const caller = req.user;

    if (isNaN(groupId) || isNaN(targetUserId)) {
      return sendError(res, 'Invalid group ID or user ID parameter.', 400);
    }

    // 1. Fetch group
    const groupRes = await db.query(
      'SELECT id, name, leader_id FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupRes.rows.length === 0) {
      return sendError(res, 'Group not found.', 404);
    }

    const group = groupRes.rows[0];

    // 2. Authorization check: leader only (or admin)
    if (caller.role !== 'admin' && group.leader_id !== caller.id) {
      return sendError(res, 'Forbidden: Only the group leader can remove members.', 403);
    }

    // 3. Prevent leader self-removal
    if (targetUserId === group.leader_id) {
      return sendError(
        res,
        'The group leader cannot be removed from the group.',
        400
      );
    }

    // 4. Check if target user is actually a member of this group
    const memberRes = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );

    if (memberRes.rows.length === 0) {
      return sendError(res, 'The specified user is not a member of this group.', 404);
    }

    // 5. Delete member
    await db.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );

    return sendSuccess(res, 'Member successfully removed from the group.');
  } catch (error) {
    next(error);
  }
};