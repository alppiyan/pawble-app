import { asyncHandler } from '../utils/asyncHandler.js';
import { adminService } from '../services/adminService.js';

export const adminController = {
  listUsers: asyncHandler(async (_req, res) => {
    const users = await adminService.listUsers();
    res.json(users);
  }),

  toggleShelter: asyncHandler(async (req, res) => {
    await adminService.setShelterFlag(req.params.userId, req.body.isShelter);
    res.json({ ok: true });
  }),
};
