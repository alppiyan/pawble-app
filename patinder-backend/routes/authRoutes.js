const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
router.put('/users/:userId', authController.updateUser); // Yeni eklenen rota
router.put('/users/:userId', authController.updateUser); // Yeni eklenen rota

module.exports = router;