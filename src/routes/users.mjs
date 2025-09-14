import express from 'express';
import { authMiddleware } from '../middlewares/auth.mjs';
import { listUsers, updateUserRole, updateUserStatus } from '../models/user.mjs';

const router = express.Router();

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const users = await listUsers(req.user.id); // Pass requesting user's ID
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/update-role', authMiddleware, async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    await updateUserRole(userId, roleId);
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    console.error('Error updating role:', err.message);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.post('/update-status', authMiddleware, async (req, res) => {
  try {
    const { userId, isActive } = req.body;
    await updateUserStatus(userId, isActive);
    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;