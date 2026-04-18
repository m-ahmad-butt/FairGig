const express = require('express');
const workSessionController = require('../controllers/workSessionController');
const {
  validateUuidParam,
  validateCreateWorkSession,
  validateUpdateWorkSession
} = require('../middleware/validation');

const router = express.Router();

router.post('/', validateCreateWorkSession, workSessionController.create);
router.get('/', workSessionController.list);
router.get('/:id', validateUuidParam, workSessionController.getById);
router.patch('/:id', validateUuidParam, validateUpdateWorkSession, workSessionController.update);
router.delete('/:id', validateUuidParam, workSessionController.remove);

module.exports = router;
