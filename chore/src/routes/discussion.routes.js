const express = require('express');
const discussionController = require('../controllers/discussion.controller');

const router = express.Router();

router.post('/rooms', discussionController.createRoom);
router.get('/rooms', discussionController.getAllPublicRooms);
router.post('/rooms/join', discussionController.joinPrivateRoom);
router.post('/rooms/:roomId/join', discussionController.joinPrivateRoom);
router.get('/rooms/:roomId', discussionController.getRoomDetails);
router.post('/topics', discussionController.createTopic);
router.get('/rooms/:roomId/topics', discussionController.getTopicsInRoom);
router.post('/topics/join', discussionController.joinPrivateTopic);
router.post('/topics/:topicId/join', discussionController.joinPrivateTopic);
router.get('/topics/:topicId', discussionController.getTopicDetails);
router.post('/topics/:topicId/messages', discussionController.sendDiscussionMessage);
router.get('/topics/:topicId/messages', discussionController.getDiscussionMessages);

module.exports = router;