import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, student_id, password } = req.body;

    // 1. Validation
    if (!name || !email || !student_id || !password) {
      return sendError(res, 'Please provide name, email, student ID, and password.', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Please provide a valid email address.', 400);
    }

    // 2. Check if user with same email exists
    const existingEmail = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (existingEmail.rows.length > 0) {
      return sendError(res, 'A user with this email address already exists.', 409);
    }

    // 3. Check if student_id is already in use
    const existingStudentId = await db.query(
      'SELECT id FROM users WHERE LOWER(student_id) = LOWER($1)',
      [student_id.trim()]
    );
    if (existingStudentId.rows.length > 0) {
      return sendError(res, 'A student with this Student ID is already registered.', 409);
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Insert new user strictly as student (Public registration must NOT allow admin creation)
    const role = 'student';
    const insertResult = await db.query(
      `INSERT INTO users (name, email, student_id, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, student_id, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), student_id.trim().toUpperCase(), passwordHash, role]
    );

    const newUser = insertResult.rows[0];
    const token = generateToken(newUser);

    return sendSuccess(res, 'Student registration successful.', {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        student_id: newUser.student_id,
        role: newUser.role,
        group: null
      }
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide both email and password.', 400);
    }

    // Find user by email
    const result = await db.query(
      'SELECT id, name, email, student_id, password_hash, role, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    // Get group info if student
    let groupInfo = null;
    if (user.role === 'student') {
      const groupRes = await db.query(
        `SELECT g.id, g.name, g.group_code, g.leader_id,
                CASE WHEN g.leader_id = $1 THEN true ELSE false END AS is_leader
         FROM group_members gm
         JOIN groups g ON gm.group_id = g.id
         WHERE gm.user_id = $1
         LIMIT 1`,
        [user.id]
      );
      if (groupRes.rows.length > 0) {
        groupInfo = groupRes.rows[0];
      }
    }

    const token = generateToken(user);

    return sendSuccess(res, 'Login successful.', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        student_id: user.student_id,
        role: user.role,
        group: groupInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    let groupInfo = null;
    if (user.role === 'student') {
      const groupRes = await db.query(
        `SELECT g.id, g.name, g.group_code, g.leader_id,
                CASE WHEN g.leader_id = $1 THEN true ELSE false END AS is_leader
         FROM group_members gm
         JOIN groups g ON gm.group_id = g.id
         WHERE gm.user_id = $1
         LIMIT 1`,
        [user.id]
      );
      if (groupRes.rows.length > 0) {
        groupInfo = groupRes.rows[0];
      }
    }

    return sendSuccess(res, 'Current user profile retrieved.', {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        student_id: user.student_id,
        role: user.role,
        created_at: user.created_at,
        group: groupInfo
      }
    });
  } catch (error) {
    next(error);
  }
};