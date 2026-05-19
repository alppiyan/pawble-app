import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import * as schemas from '../validators/authValidators.js';

const router = Router();

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.get('/me', authMiddleware, authController.me);
router.put('/users/me', authMiddleware, validate(schemas.updateProfile), authController.updateProfile);

export default router;
