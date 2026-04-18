const express = require('express');
const evidenceController = require('../controllers/evidenceController');
const {
  validateUuidParam,
  validateWorkerIdParam,
  validateWorkerAndSessionParams,
  validateCreateEvidence,
  validateBulkEvidence,
  validateUpdateEvidence,
  validateEvidenceVerifiedUpdate
} = require('../middleware/validation');

const router = express.Router();

router.post('/', validateCreateEvidence, evidenceController.create);
router.post('/bulk', validateBulkEvidence, evidenceController.bulkCreate);
router.get('/', evidenceController.list);
router.get('/unverified/detailed', evidenceController.listUnverifiedDetailed);
router.get('/worker/:worker_id', validateWorkerIdParam, evidenceController.getByWorkerId);
router.get('/worker/:worker_id/session/:session_id', validateWorkerAndSessionParams, evidenceController.getByWorkerAndSession);
router.get('/:id', validateUuidParam, evidenceController.getById);
router.patch('/:id/verified', validateUuidParam, validateEvidenceVerifiedUpdate, evidenceController.updateVerified);
router.patch('/:id', validateUuidParam, validateUpdateEvidence, evidenceController.update);
router.delete('/:id', validateUuidParam, evidenceController.remove);

module.exports = router;
