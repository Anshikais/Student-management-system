import express from 'express';
import {
  getAdminDashboard,
  getAdminGroups,
  getAdminAnalytics
} from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict admin-only protection
router.use(authenticate, requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/groups', getAdminGroups);
router.get('/analytics', getAdminAnalytics);

export default router;