import { Router } from 'express';
import { petController } from '../controllers/petController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { petMediaUpload } from '../middlewares/uploadMiddleware.js';
import { validate } from '../middlewares/validate.js';
import * as schemas from '../validators/petValidators.js';

const router = Router();
router.use(authMiddleware);

router.get('/mine', petController.listMine);
router.post('/', petMediaUpload, validate(schemas.addPet), petController.create);
router.put('/:petId', petMediaUpload, validate(schemas.updatePet), petController.update);
router.delete('/:petId', validate(schemas.petIdParam), petController.remove);
router.get('/:petId/stats', validate(schemas.petIdParam), petController.stats);

export default router;
