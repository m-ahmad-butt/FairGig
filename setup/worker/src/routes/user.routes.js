const express = require('express');
const multer = require('multer');
const userController = require('../controllers/user.controller');

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/upload-image', upload.single('imageUrl'), userController.uploadImage);
router.get('/public/:email', userController.getPublicProfile);
router.get('/reputation/:email', userController.getReputation);
router.post('/reputation/:email/add', userController.addReputation);
router.post('/reputation/:email/deduct', userController.deductReputation);
router.get('/reputation/:email/history', userController.getReputationHistory);
router.get('/chat-users', userController.getAllUsers);

module.exports = router;