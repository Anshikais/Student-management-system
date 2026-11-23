import express from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment
} from '../controllers/assignmentController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All assignment routes require authentication
router.use(authenticate);

// Student & Admin accessible
router.get('/', getAssignments);
router.get('/:id', getAssignmentById);

// Admin-only operations
router.post('/', requireAdmin, createAssignment);
router.put('/:id', requireAdmin, updateAssignment);
router.delete('/:id', requireAdmin, deleteAssignment);

export default router;