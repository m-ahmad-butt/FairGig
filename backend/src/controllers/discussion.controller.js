const discussionRepo = require('../repositories/discussion.repository');
const userRepo = require('../repositories/user.repository');
const { publishMessage } = require('../config/rabbitmq');

const createRoom = async (req, res) => {
  try {
    const { name, code, isPublic } = req.body;
    const createdBy = req.headers['x-user-email'];

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    if (!/^[a-zA-Z0-9]{8}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be exactly 8 alphanumeric characters' });
    }

    const existingRoom = await discussionRepo.findRoomByCode(code);
    if (existingRoom) {
      return res.status(400).json({ error: 'Room code already exists' });
    }

    const room = await discussionRepo.createRoom({
      name,
      code,
      isPublic: isPublic === true,
      createdBy
    });

    await discussionRepo.addRoomMember(room.id, createdBy);

    res.status(201).json(room);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

const getAllPublicRooms = async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    const rooms = userEmail 
      ? await discussionRepo.getAllRoomsForUser(userEmail)
      : await discussionRepo.getAllPublicRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

const joinPrivateRoom = async (req, res) => {
  try {
    const { code } = req.body;
    const { roomId } = req.params;
    const userEmail = req.headers['x-user-email'];

    let room;

    if (roomId) {
      room = await discussionRepo.findRoomById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      if (!room.isPublic && code && room.code !== code) {
        return res.status(403).json({ error: 'Invalid room code' });
      }
    } else if (code) {
      if (!/^[a-zA-Z0-9]{8}$/.test(code)) {
        return res.status(400).json({ error: 'Invalid room code' });
      }
      room = await discussionRepo.findRoomByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
    } else {
      return res.status(400).json({ error: 'Room ID or code is required' });
    }

    try {
      await discussionRepo.addRoomMember(room.id, userEmail);
    } catch (err) {
      if (err.code !== 'P2002') throw err;
    }

    res.json({ ...room, isMember: true });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

const getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await discussionRepo.findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
};

const createTopic = async (req, res) => {
  try {
    const { roomId, name, code, isPublic } = req.body;
    const createdBy = req.headers['x-user-email'];

    if (!name || !code || !roomId) {
      return res.status(400).json({ error: 'Name, code, and roomId are required' });
    }

    if (!/^[a-zA-Z0-9]{8}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be exactly 8 alphanumeric characters' });
    }

    const room = await discussionRepo.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy !== createdBy) {
      return res.status(403).json({ error: 'Only the room owner can create topics' });
    }

    const existingTopic = await discussionRepo.findTopicByCode(code);
    if (existingTopic) {
      return res.status(400).json({ error: 'Topic code already exists' });
    }

    const topic = await discussionRepo.createTopic({
      roomId,
      name,
      code,
      isPublic: isPublic === true,
      createdBy
    });

    await discussionRepo.addTopicMember(topic.id, createdBy);

    res.status(201).json(topic);
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

const getTopicsInRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await discussionRepo.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const topics = await discussionRepo.getTopicsInRoom(roomId);
    res.json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
};

const joinPrivateTopic = async (req, res) => {
  try {
    const { code } = req.body;
    const { topicId } = req.params;
    const userEmail = req.headers['x-user-email'];

    let topic;

    if (topicId) {
      topic = await discussionRepo.findTopicById(topicId);
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      
      if (!topic.isPublic && code && topic.code !== code) {
        return res.status(403).json({ error: 'Invalid topic code' });
      }
    } else if (code) {
      if (!/^[a-zA-Z0-9]{8}$/.test(code)) {
        return res.status(400).json({ error: 'Invalid topic code' });
      }
      topic = await discussionRepo.findTopicByCode(code);
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
    } else {
      return res.status(400).json({ error: 'Topic ID or code is required' });
    }

    try {
      await discussionRepo.addTopicMember(topic.id, userEmail);
    } catch (err) {
      if (err.code !== 'P2002') throw err;
    }

    res.json({ ...topic, isMember: true });
  } catch (error) {
    console.error('Join topic error:', error);
    res.status(500).json({ error: 'Failed to join topic' });
  }
};

const getTopicDetails = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userEmail = req.headers['x-user-email'];

    const topic = await discussionRepo.findTopicById(topicId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (topic.isPublic && userEmail) {
      try {
        await discussionRepo.addTopicMember(topic.id, userEmail);
      } catch (err) {
        if (err.code !== 'P2002') throw err;
      }
    }

    res.json(topic);
  } catch (error) {
    console.error('Get topic details error:', error);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
};

const sendDiscussionMessage = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { content, isAnonymous } = req.body;
    const senderEmail = req.headers['x-user-email'];

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const topic = await discussionRepo.findTopicById(topicId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    let senderName = 'Anonymous';
    if (!isAnonymous) {
      try {
        const user = await userRepo.findByEmail(senderEmail);
        senderName = user?.name || senderEmail;
      } catch (err) {
        console.error('Failed to fetch user name:', err.message);
        senderName = senderEmail;
      }
    }

    const message = await discussionRepo.createDiscussionMessage({
      topicId,
      content,
      senderEmail,
      senderName,
      isAnonymous: isAnonymous === true
    });

    await publishMessage('discussion.message', {
      topicId,
      senderEmail,
      senderName,
      content
    }, 'hackathon.topic');

    try {
      const { getIo } = require('../socket');
      getIo().to(topicId).emit('new_discussion_message', message);
    } catch (err) {
      console.error('WebSocket error:', err.message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send discussion message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const getDiscussionMessages = async (req, res) => {
  try {
    const { topicId } = req.params;

    const topic = await discussionRepo.findTopicById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const messages = await discussionRepo.getDiscussionMessages(topicId);
    res.json(messages);
  } catch (error) {
    console.error('Get discussion messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

module.exports = {
  createRoom,
  getAllPublicRooms,
  joinPrivateRoom,
  getRoomDetails,
  createTopic,
  getTopicsInRoom,
  joinPrivateTopic,
  getTopicDetails,
  sendDiscussionMessage,
  getDiscussionMessages
};
