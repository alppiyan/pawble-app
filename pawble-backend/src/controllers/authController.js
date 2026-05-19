import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../services/authService.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.getCurrent(req.user.id);
    res.json({ user });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ user });
  }),
};
