import express from 'express';
import {
  createGroup,
  getGroups,
  getGroupById,
  addMember,
  removeMember
} from '../controllers/groupController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All group routes require authentication
router.use(authenticate);

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

export default router;