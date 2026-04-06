const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/conversations/:userId', chatController.getConversations);
router.get('/messages/:userId/:otherId', chatController.getMessages);
router.post('/messages', chatController.sendMessage);

module.exports = router;