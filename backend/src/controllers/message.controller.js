const messageRepo = require('../repositories/message.repository');
const userRepo = require('../repositories/user.repository');
const { publishMessage } = require('../config/rabbitmq');

const getChats = async (req, res) => {
  try {
    const email = req.headers['x-user-email'];
    const chats = await messageRepo.getAllChatsForUser(email);
    
    const chatsWithProfiles = await Promise.all(
      chats.map(async (chat) => {
        const otherUserEmail = chat.user1 === email ? chat.user2 : chat.user1;
        try {
          const profile = await userRepo.findByEmail(otherUserEmail);
          return {
            ...chat,
            otherUserEmail,
            otherUserName: profile?.name || null,
            profileImageUrl: profile?.imageUrl || null
          };
        } catch (err) {
          console.error(`Failed to fetch profile for ${otherUserEmail}:`, err.message);
          return {
            ...chat,
            otherUserEmail,
            otherUserName: null,
            profileImageUrl: null
          };
        }
      })
    );
    
    res.status(200).json(chatsWithProfiles);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
};

const createOrGetChat = async (req, res) => {
  try {
    const email = req.headers['x-user-email'];
    const { otherUserEmail } = req.body;

    if (!otherUserEmail) {
      return res.status(400).json({ message: 'otherUserEmail is required' });
    }

    let chat = await messageRepo.findChatByUsers(email, otherUserEmail);
    if (!chat) {
      chat = await messageRepo.createChat(email, otherUserEmail);
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await messageRepo.findChatById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.status(200).json(chat);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const email = req.headers['x-user-email'];
    const { chatId } = req.params;
    const { content } = req.body;

    const chat = await messageRepo.findChatById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const receiver = chat.user1 === email ? chat.user2 : chat.user1;
    
    const message = await messageRepo.createMessage({
      chatId,
      sender: email,
      receiver,
      content
    });

    await publishMessage('message.sent', { chatId, senderId: email, receiverId: receiver, content }, 'hackathon.topic');

    try {
      const { getIo } = require('../socket');
      getIo().to(chatId).emit('new_message', message);
    } catch (err) {
      console.error('WebSocket error:', err.message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendChatRequest = async (req, res) => {
  try {
    const from = req.headers['x-user-email'];
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    const existingChat = await messageRepo.findChatByUsers(from, to);
    if (existingChat) {
      return res.status(400).json({ message: 'Chat already exists' });
    }

    const chat = await messageRepo.createChat(from, to);
    
    res.status(201).json({ message: 'Chat request sent', chat });
  } catch (error) {
    console.error('Send chat request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getChats, createOrGetChat, getChatById, sendMessage, sendChatRequest };
