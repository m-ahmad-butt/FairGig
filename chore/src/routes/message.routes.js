const express = require('express');
const messageController = require('../controllers/message.controller');

const router = express.Router();

router.get('/chats', messageController.getChats);
router.post('/chats', messageController.createOrGetChat);
router.get('/chats/:chatId', messageController.getChatById);
router.post('/chats/:chatId', messageController.sendMessage);
router.post('/chat-requests', messageController.sendChatRequest);

module.exports = router;