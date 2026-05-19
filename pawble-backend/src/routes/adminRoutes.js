import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validate.js';
import * as schemas from '../validators/adminValidators.js';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/users', adminController.listUsers);
router.put(
  '/users/:userId/shelter',
  validate(schemas.toggleShelter),
  adminController.toggleShelter,
);

export default router;
