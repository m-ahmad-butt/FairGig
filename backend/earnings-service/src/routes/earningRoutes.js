const express = require('express');
const earningController = require('../controllers/earningController');
const {
  validateUuidParam,
  validateWorkerAndSessionParams,
  validateCreateEarning,
  validateBulkEarnings,
  validateUpdateEarning
} = require('../middleware/validation');

const router = express.Router();

router.post('/', validateCreateEarning, earningController.create);
router.post('/bulk', validateBulkEarnings, earningController.bulkCreate);
router.get('/', earningController.list);
router.get('/worker/:worker_id/session/:session_id', validateWorkerAndSessionParams, earningController.getByWorkerAndSession);
router.get('/:id', validateUuidParam, earningController.getById);
router.patch('/:id', validateUuidParam, validateUpdateEarning, earningController.update);
router.delete('/:id', validateUuidParam, earningController.remove);

module.exports = router;
