import express from 'express';
import {
  confirmSubmission,
  getSubmissions,
  getProgress,
  getAssignmentSubmissions
} from '../controllers/submissionController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All submission routes require authentication
router.use(authenticate);

router.post('/confirm', confirmSubmission);
router.get('/', getSubmissions);
router.get('/progress', getProgress);
router.get('/assignment/:assignmentId', getAssignmentSubmissions);

export default router;