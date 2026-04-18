const express = require('express');
const earningController = require('../controllers/earningController');
const {
  validateUuidParam,
  validateCreateEarning,
  validateUpdateEarning
} = require('../middleware/validation');

const router = express.Router();

router.post('/', validateCreateEarning, earningController.create);
router.get('/', earningController.list);
router.get('/:id', validateUuidParam, earningController.getById);
router.patch('/:id', validateUuidParam, validateUpdateEarning, earningController.update);
router.delete('/:id', validateUuidParam, earningController.remove);

module.exports = router;
