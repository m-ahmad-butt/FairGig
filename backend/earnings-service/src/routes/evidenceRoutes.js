const express = require('express');
const evidenceController = require('../controllers/evidenceController');
const {
  validateUuidParam,
  validateCreateEvidence,
  validateUpdateEvidence
} = require('../middleware/validation');

const router = express.Router();

router.post('/', validateCreateEvidence, evidenceController.create);
router.get('/', evidenceController.list);
router.get('/:id', validateUuidParam, evidenceController.getById);
router.patch('/:id', validateUuidParam, validateUpdateEvidence, evidenceController.update);
router.delete('/:id', validateUuidParam, evidenceController.remove);

module.exports = router;
