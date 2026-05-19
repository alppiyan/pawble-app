import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import * as schemas from '../validators/chatValidators.js';

const router = Router();
router.use(authMiddleware);

router.get('/conversations', chatController.listConversations);
router.get(
  '/conversations/:otherId/messages',
  validate(schemas.otherIdParam),
  chatController.listMessages,
);
router.post('/messages', validate(schemas.sendMessage), chatController.send);

export default router;
