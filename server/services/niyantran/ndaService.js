const { v2: cloudinary } = require('cloudinary');
const { Candidate, NiyantranNDA } = require('../../models/niyantran');
const { transitionCandidate } = require('./transitionService');
const { resolveTraceId, logAction } = require('./auditService');

let isCloudinaryConfigured = false;

function ensureCloudinaryConfigured() {
  if (isCloudinaryConfigured) {
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  isCloudinaryConfigured = true;
}

function makeDateToken(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function generateNdaId() {
  const dateToken = makeDateToken();

  for (let i = 0; i < 5; i += 1) {
    const suffix = String(Math.floor(Math.random() * 90000) + 10000);
    const ndaId = `NDA-${dateToken}-${suffix}`;
    const existing = await NiyantranNDA.findOne({ ndaId }).select('_id').lean();

    if (!existing) {
      return ndaId;
    }
  }

  throw new Error('Unable to generate unique ndaId');
}

async function uploadNdaToBucket(candidateId, ndaId, fileBuffer) {
  ensureCloudinaryConfigured();

  const dataUri = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'raw',
    public_id: `ndas/${candidateId}/${ndaId}`,
    format: 'pdf',
    overwrite: false,
    use_filename: true,
    unique_filename: false,
    access_mode: 'private',
  });

  return result.secure_url;
}

async function createNdaFromUpload({ candidateId, file, performedBy, incomingTraceId }) {
  if (!candidateId) {
    throw new Error('candidateId is required');
  }

  if (!file || !file.buffer) {
    throw new Error('NDA PDF file is required');
  }

  const candidate = await Candidate.findById(candidateId);
  if (!candidate) {
    throw new Error('Candidate not found');
  }

  const traceId = resolveTraceId(incomingTraceId);
  const ndaId = await generateNdaId();
  const fileUrl = await uploadNdaToBucket(candidateId, ndaId, file.buffer);

  const ndaDoc = await NiyantranNDA.create({
    candidateId,
    ndaId,
    status: 'pending',
    fileUrl,
    performed_by: performedBy,
    trace_id: traceId,
  });

  await Candidate.findByIdAndUpdate(
    candidateId,
    {
      $set: {
        ndaStatus: 'pending',
        ndaDocumentId: ndaDoc._id,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  await logAction({
    candidateId,
    action: 'upload_nda',
    fromState: candidate.status,
    toState: candidate.status,
    performedBy,
    trace_id: traceId,
    metadata: {
      ndaId,
      ndaDocumentId: ndaDoc._id,
      fileUrl,
    },
  });

  return {
    ndaId,
    fileUrl,
    trace_id: traceId,
    ndaDocumentId: ndaDoc._id,
  };
}

async function signNda({ ndaId, signatureHash, ip, userAgent, performedBy, incomingTraceId }) {
  if (!ndaId) {
    throw new Error('ndaId is required');
  }

  if (!signatureHash) {
    throw new Error('signatureHash is required');
  }

  const ndaDoc = await NiyantranNDA.findOne({ ndaId });
  if (!ndaDoc) {
    throw new Error('NDA not found');
  }

  if (ndaDoc.status === 'submitted') {
    throw new Error('NDA is immutable after submitted status');
  }

  const traceId = resolveTraceId(incomingTraceId);
  const signedAt = new Date();

  ndaDoc.status = 'signed';
  ndaDoc.signedAt = signedAt;
  ndaDoc.signedBy = performedBy;
  ndaDoc.signatureMetadata = {
    signatureHash,
    timestamp: signedAt,
    ip: ip || null,
    userAgent: userAgent || null,
  };
  ndaDoc.performed_by = performedBy;
  ndaDoc.trace_id = traceId;

  await ndaDoc.save();

  const candidate = await Candidate.findByIdAndUpdate(
    ndaDoc.candidateId,
    {
      $set: {
        ndaStatus: 'signed',
        ndaDocumentId: ndaDoc._id,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  await logAction({
    candidateId: String(ndaDoc.candidateId),
    action: 'sign_nda',
    fromState: candidate ? candidate.status : null,
    toState: candidate ? candidate.status : null,
    performedBy,
    trace_id: traceId,
    metadata: {
      ndaId,
      signedAt,
      signatureHash,
    },
  });

  return {
    ndaId,
    status: ndaDoc.status,
    signedAt: ndaDoc.signedAt,
    trace_id: traceId,
  };
}

async function submitNda({ ndaId, performedBy, incomingTraceId }) {
  if (!ndaId) {
    throw new Error('ndaId is required');
  }

  const ndaDoc = await NiyantranNDA.findOne({ ndaId });
  if (!ndaDoc) {
    throw new Error('NDA not found');
  }

  if (ndaDoc.status === 'submitted') {
    throw new Error('NDA is already submitted');
  }

  if (ndaDoc.status !== 'signed') {
    throw new Error('NDA must be signed before submission');
  }

  const traceId = resolveTraceId(incomingTraceId);
  const submittedAt = new Date();

  ndaDoc.status = 'submitted';
  ndaDoc.submittedAt = submittedAt;
  ndaDoc.performed_by = performedBy;
  ndaDoc.trace_id = traceId;
  await ndaDoc.save();

  await Candidate.findByIdAndUpdate(
    ndaDoc.candidateId,
    {
      $set: {
        ndaStatus: 'submitted',
        ndaDocumentId: ndaDoc._id,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  const transitionResult = await transitionCandidate(
    ndaDoc.candidateId,
    'NDA_SUBMITTED',
    'submit_nda',
    'NDA submitted via API',
    performedBy,
    { traceId }
  );

  await logAction({
    candidateId: String(ndaDoc.candidateId),
    action: 'submit_nda',
    fromState: 'NDA_PENDING',
    toState: 'NDA_SUBMITTED',
    performedBy,
    trace_id: traceId,
    metadata: {
      ndaId,
      submittedAt,
      taskHistoryId: transitionResult.history.historyId,
    },
  });

  return {
    ndaId,
    status: ndaDoc.status,
    submittedAt: ndaDoc.submittedAt,
    trace_id: traceId,
    candidateStatus: transitionResult.candidate.status,
  };
}

module.exports = {
  createNdaFromUpload,
  signNda,
  submitNda,
};
