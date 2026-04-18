const express = require('express');
const workSessionController = require('../controllers/workSessionController');
const {
  validateUuidParam,
  validateWorkerIdParam,
  validateCreateWorkSession,
  validateBulkWorkSessions,
  validateUpdateWorkSession
} = require('../middleware/validation');

const router = express.Router();

router.post('/', validateCreateWorkSession, workSessionController.create);
router.post('/bulk', validateBulkWorkSessions, workSessionController.bulkCreate);
router.get('/', workSessionController.list);
router.get('/worker/:worker_id', validateWorkerIdParam, workSessionController.getByWorkerId);
router.get('/:id', validateUuidParam, workSessionController.getById);
router.patch('/:id', validateUuidParam, validateUpdateWorkSession, workSessionController.update);
router.delete('/:id', validateUuidParam, workSessionController.remove);

module.exports = router;
