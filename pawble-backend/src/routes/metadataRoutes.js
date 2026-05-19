import { Router } from 'express';
import { metadataController } from '../controllers/metadataController.js';

const router = Router();

router.get('/', metadataController.getAll);

export default router;
