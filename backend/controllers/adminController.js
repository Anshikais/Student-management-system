import db from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/admin/dashboard
 * Summary stats, recent submissions, and quick metrics for Professor
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    const totalStudentsRes = await db.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'student'");
    const totalGroupsRes = await db.query('SELECT COUNT(*)::int as count FROM groups');
    const totalAssignmentsRes = await db.query('SELECT COUNT(*)::int as count FROM assignments');

    const totalStudents = totalStudentsRes.rows[0].count;
    const totalGroups = totalGroupsRes.rows[0].count;
    const totalAssignments = totalAssignmentsRes.rows[0].count;

    // Per group calculations
    const groupsProgressRes = await db.query(
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

    let completedGroups = 0;
    let pendingGroups = 0;
    let totalPairs = 0;
    let totalCompleted = 0;

    const groupSummaries = groupsProgressRes.rows.map(g => {
      const total = g.total_assigned || 0;
      const completed = g.completed_count || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      totalPairs += total;
      totalCompleted += completed;

      if (total > 0 && completed === total) {
        completedGroups++;
      } else if (total > 0) {
        pendingGroups++;
      }

      return {
        id: g.id,
        name: g.name,
        group_code: g.group_code,
        leader_name: g.leader_name,
        total_assigned: total,
        completed,
        pending: Math.max(0, total - completed),
        progress_percentage: pct,
        is_completed: total > 0 && completed === total
      };
    });

    const overallPercentage = totalPairs > 0 ? Math.round((totalCompleted / totalPairs) * 100) : 0;

    // Recent 5 submissions
    const recentSubmissionsRes = await db.query(
      `SELECT s.id, s.confirmed_at,
              a.title as assignment_title,
              g.name as group_name, g.group_code,
              u.name as confirmed_by_name, u.student_id as confirmed_by_student_id,
              CASE WHEN s.confirmed_at > a.due_date THEN true ELSE false END as is_late
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN groups g ON s.group_id = g.id
       JOIN users u ON s.confirmed_by = u.id
       ORDER BY s.confirmed_at DESC
       LIMIT 5`
    );

    return sendSuccess(res, 'Admin dashboard summary retrieved.', {
      total_students: totalStudents,
      total_groups: totalGroups,
      total_assignments: totalAssignments,
      completed_groups: completedGroups,
      pending_groups: pendingGroups,
      overall_progress_percentage: overallPercentage,
      group_summaries: groupSummaries,
      recent_submissions: recentSubmissionsRes.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/groups
 * All groups with leader details, member count, and progress
 */
export const getAdminGroups = async (req, res, next) => {
  try {
    const groupsRes = await db.query(
      `SELECT g.id, g.name, g.group_code, g.leader_id, g.created_at,
              u.name as leader_name, u.email as leader_email, u.student_id as leader_student_id,
              COUNT(DISTINCT gm.id)::int as member_count,
              COUNT(DISTINCT s.id)::int as completed_submissions
       FROM groups g
       JOIN users u ON g.leader_id = u.id
       LEFT JOIN group_members gm ON g.id = gm.group_id
       LEFT JOIN submissions s ON g.id = s.group_id
       GROUP BY g.id, g.name, g.group_code, g.leader_id, g.created_at, u.name, u.email, u.student_id
       ORDER BY g.created_at DESC`
    );

    return sendSuccess(res, 'Admin groups list retrieved.', {
      groups: groupsRes.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics
 * Deep analytics breakdown for charts and reporting
 */
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const totalStudentsRes = await db.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'student'");
    const totalGroupsRes = await db.query('SELECT COUNT(*)::int as count FROM groups');
    const totalAssignmentsRes = await db.query('SELECT COUNT(*)::int as count FROM assignments');
    const totalSubmissionsRes = await db.query('SELECT COUNT(*)::int as count FROM submissions');

    // On-time vs late submissions count
    const timelinessRes = await db.query(
      `SELECT 
         COUNT(CASE WHEN s.confirmed_at <= a.due_date THEN 1 END)::int as on_time,
         COUNT(CASE WHEN s.confirmed_at > a.due_date THEN 1 END)::int as late
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id`
    );

    // Group completion breakdown
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

    let totalPairs = 0;
    let totalCompleted = 0;
    let completedGroupsCount = 0;
    let pendingGroupsCount = 0;

    const groupMetrics = groupsRes.rows.map(g => {
      const total = g.total_assigned || 0;
      const completed = g.completed_count || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      totalPairs += total;
      totalCompleted += completed;

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
        pending: Math.max(0, total - completed),
        progress_percentage: pct,
        is_completed: total > 0 && completed === total
      };
    });

    const overallPct = totalPairs > 0 ? Math.round((totalCompleted / totalPairs) * 100) : 0;

    return sendSuccess(res, 'Admin analytics retrieved.', {
      overview: {
        total_students: totalStudentsRes.rows[0].count,
        total_groups: totalGroupsRes.rows[0].count,
        total_assignments: totalAssignmentsRes.rows[0].count,
        total_submissions: totalSubmissionsRes.rows[0].count,
        completed_groups: completedGroupsCount,
        pending_groups: pendingGroupsCount,
        overall_progress_percentage: overallPct,
        on_time_submissions: timelinessRes.rows[0].on_time,
        late_submissions: timelinessRes.rows[0].late
      },
      groups: groupMetrics
    });
  } catch (error) {
    next(error);
  }
};