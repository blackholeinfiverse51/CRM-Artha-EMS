const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const {
  createNdaFromUpload,
  signNda,
  submitNda,
} = require('../services/niyantran/ndaService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const isPdf = file && file.mimetype === 'application/pdf';
    if (!isPdf) {
      return cb(new Error('Only PDF files are allowed for NDA upload'));
    }

    return cb(null, true);
  },
});

function extractPerformedBy(req) {
  return req.user && req.user.id ? String(req.user.id) : 'system';
}

function setTraceHeader(res, traceId) {
  if (traceId) {
    res.setHeader('X-Trace-ID', traceId);
  }
}

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);

    const result = await createNdaFromUpload({
      candidateId: req.body.candidateId,
      file: req.file,
      performedBy,
      incomingTraceId: req.header('x-trace-id') || null,
    });

    setTraceHeader(res, result.trace_id);

    return res.status(201).json({
      ndaId: result.ndaId,
      fileUrl: result.fileUrl,
      trace_id: result.trace_id,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

router.post('/sign', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);

    const result = await signNda({
      ndaId: req.body.ndaId,
      signatureHash: req.body.signatureHash,
      ip: req.body.ip || req.ip,
      userAgent: req.body.userAgent || req.headers['user-agent'],
      performedBy,
      incomingTraceId: req.header('x-trace-id') || null,
    });

    setTraceHeader(res, result.trace_id);

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

router.post('/submit', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);

    const result = await submitNda({
      ndaId: req.body.ndaId,
      performedBy,
      incomingTraceId: req.header('x-trace-id') || null,
    });

    setTraceHeader(res, result.trace_id);

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

module.exports = router;
