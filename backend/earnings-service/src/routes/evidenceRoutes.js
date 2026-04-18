const express = require('express');
const multer = require('multer');
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

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPG, PNG, or WebP images are allowed');
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      callback(error);
      return;
    }

    callback(null, true);
  }
});

function handleEvidenceUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Image must be under 10MB' });
      return;
    }

    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(400).json({ error: error.message || 'Invalid image upload' });
  });
}

router.post('/', validateCreateEvidence, evidenceController.create);
router.post('/bulk', validateBulkEvidence, evidenceController.bulkCreate);
router.post('/upload', handleEvidenceUpload, evidenceController.uploadEvidenceBinary);
router.get('/', evidenceController.list);
router.get('/unverified/detailed', evidenceController.listUnverifiedDetailed);
router.get('/presigned-url', evidenceController.getPresignedUrl);
router.get('/worker/:worker_id', validateWorkerIdParam, evidenceController.getByWorkerId);
router.get('/worker/:worker_id/session/:session_id', validateWorkerAndSessionParams, evidenceController.getByWorkerAndSession);
router.get('/:id', validateUuidParam, evidenceController.getById);
router.patch('/:id/verified', validateUuidParam, validateEvidenceVerifiedUpdate, evidenceController.updateVerified);
router.patch('/:id', validateUuidParam, validateUpdateEvidence, evidenceController.update);
router.delete('/:id', validateUuidParam, evidenceController.remove);

module.exports = router;
