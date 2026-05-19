import { Router } from 'express';
import { matchController } from '../controllers/matchController.js';
import { petController } from '../controllers/petController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import * as schemas from '../validators/matchValidators.js';
import * as petSchemas from '../validators/petValidators.js';

const router = Router();
router.use(authMiddleware);

router.get('/candidates', validate(schemas.candidatesQuery), matchController.candidates);
router.post('/swipes', validate(schemas.recordSwipe), matchController.swipe);
router.get('/history', validate(schemas.historyQuery), matchController.history);
router.post('/adoptions', validate(petSchemas.adoptPet), petController.adopt);

export default router;
