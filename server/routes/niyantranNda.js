const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { executeMutationWithOptionalIdempotency } = require('../services/niyantran/idempotencyService');
const { resolveTraceId } = require('../services/niyantran/auditService');
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

function getIdempotencyKey(req) {
  return req.header('x-idempotency-key') || (req.body && req.body.idempotencyKey) || null;
}

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const traceId = resolveTraceId(req.header('x-trace-id') || (req.body && req.body.trace_id) || null);

    const wrapped = await executeMutationWithOptionalIdempotency({
      idempotencyKey: getIdempotencyKey(req),
      action: 'upload_nda',
      candidateId: req.body.candidateId,
      traceId,
      requestPayload: {
        candidateId: req.body.candidateId,
        fileName: req.file ? req.file.originalname : null,
        fileSize: req.file ? req.file.size : null,
      },
      handler: async () => {
        const result = await createNdaFromUpload({
          candidateId: req.body.candidateId,
          file: req.file,
          performedBy,
          incomingTraceId: traceId,
        });

        return {
          statusCode: 201,
          trace_id: result.trace_id,
          responsePayload: {
            ndaId: result.ndaId,
            fileUrl: result.fileUrl,
            trace_id: result.trace_id,
          },
        };
      },
    });

    setTraceHeader(res, wrapped.trace_id);
    return res.status(wrapped.statusCode).json({
      ...wrapped.responsePayload,
      replayed: wrapped.replayed,
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
    const traceId = resolveTraceId(req.header('x-trace-id') || (req.body && req.body.trace_id) || null);

    const wrapped = await executeMutationWithOptionalIdempotency({
      idempotencyKey: getIdempotencyKey(req),
      action: 'sign_nda',
      traceId,
      requestPayload: {
        ndaId: req.body.ndaId,
        signatureHash: req.body.signatureHash,
        ip: req.body.ip || req.ip,
        userAgent: req.body.userAgent || req.headers['user-agent'],
      },
      handler: async () => {
        const result = await signNda({
          ndaId: req.body.ndaId,
          signatureHash: req.body.signatureHash,
          ip: req.body.ip || req.ip,
          userAgent: req.body.userAgent || req.headers['user-agent'],
          performedBy,
          incomingTraceId: traceId,
        });

        return {
          statusCode: 200,
          trace_id: result.trace_id,
          responsePayload: result,
        };
      },
    });

    setTraceHeader(res, wrapped.trace_id);

    return res.status(wrapped.statusCode).json({
      ...wrapped.responsePayload,
      replayed: wrapped.replayed,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

router.post('/submit', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const traceId = resolveTraceId(req.header('x-trace-id') || (req.body && req.body.trace_id) || null);

    const wrapped = await executeMutationWithOptionalIdempotency({
      idempotencyKey: getIdempotencyKey(req),
      action: 'submit_nda',
      traceId,
      requestPayload: {
        ndaId: req.body.ndaId,
      },
      handler: async () => {
        const result = await submitNda({
          ndaId: req.body.ndaId,
          performedBy,
          incomingTraceId: traceId,
        });

        return {
          statusCode: 200,
          trace_id: result.trace_id,
          responsePayload: result,
        };
      },
    });

    setTraceHeader(res, wrapped.trace_id);

    return res.status(wrapped.statusCode).json({
      ...wrapped.responsePayload,
      replayed: wrapped.replayed,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

module.exports = router;
