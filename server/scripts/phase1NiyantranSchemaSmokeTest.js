const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Candidate, NiyantranNDA, NiyantranTask, TaskHistory } = require('../models/niyantran');

function formatDatePart(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function randomSuffix() {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

function buildIds() {
  const day = formatDatePart();
  const suffix = randomSuffix();

  return {
    candidateId: `CAND-${day}-${suffix}`,
    ndaId: `NDA-${day}-${suffix}`,
    taskId: `TASK-${day}-${suffix}`,
    historyId: `TH-${day}-${suffix}`,
  };
}

async function run() {
  const ids = buildIds();
  const actor = 'agent:phase1-smoke-test';

  const candidateObjectId = new mongoose.Types.ObjectId();
  const ndaObjectId = new mongoose.Types.ObjectId();
  const taskObjectId = new mongoose.Types.ObjectId();

  const candidateDoc = new Candidate({
    _id: candidateObjectId,
    candidateId: ids.candidateId,
    name: 'Phase One Candidate',
    email: `phase1.${ids.candidateId.toLowerCase()}@example.com`,
    phone: '+91-9000000000',
    role: 'Backend Engineer',
    status: 'TASK_ASSIGNED',
    currentTaskId: taskObjectId,
    ndaStatus: 'submitted',
    ndaDocumentId: ndaObjectId,
    metadata: {
      source: 'phase1-smoke-test',
      sarathiPolicy: 'PDP-NIYANTRAN-001',
    },
    performed_by: actor,
  });

  const ndaDoc = new NiyantranNDA({
    _id: ndaObjectId,
    candidateId: candidateObjectId,
    ndaId: ids.ndaId,
    status: 'submitted',
    fileUrl: 'bucket://niyantran/nda/sample-signed.pdf',
    signedAt: new Date(),
    submittedAt: new Date(),
    signedBy: candidateDoc.email,
    signatureMetadata: {
      signatureHash: 'sha256:demo-signature-hash',
      timestamp: new Date(),
      ip: '127.0.0.1',
      userAgent: 'phase1-smoke-test-runner',
    },
    performed_by: actor,
  });

  const taskDoc = new NiyantranTask({
    _id: taskObjectId,
    taskId: ids.taskId,
    candidateId: candidateObjectId,
    title: 'Build deterministic workflow endpoint',
    description: 'Implement deterministic candidate lifecycle APIs for Niyantran.',
    instructions: 'Submit either repository link or design document before due date.',
    attachedFiles: [
      {
        url: 'bucket://niyantran/tasks/spec-v1.pdf',
        name: 'spec-v1.pdf',
      },
    ],
    status: 'ASSIGNED',
    assignedAt: new Date(),
    dueDate: null,
    isActive: true,
    assignedBy: 'recruiter:demo',
    performed_by: actor,
  });

  const historyDoc = new TaskHistory({
    historyId: ids.historyId,
    candidateId: candidateObjectId,
    taskId: taskObjectId,
    fromState: 'ASSIGNED',
    toState: 'IN_PROGRESS',
    action: 'start_task',
    reason: 'candidate_started_work',
    performed_by: actor,
    performed_at: new Date(),
    metadata: {
      sarathiDecision: 'allow',
      replaySafe: true,
    },
  });

  await candidateDoc.validate();
  await ndaDoc.validate();
  await taskDoc.validate();
  await historyDoc.validate();

  console.log('Validation successful for Candidate, NDA, Task, and TaskHistory sample documents.');

  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI is not set. Skipping persistence step and exiting after schema validation.');
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Writing and cleaning smoke-test documents...');

  try {
    await Candidate.create(candidateDoc.toObject());
    await NiyantranNDA.create(ndaDoc.toObject());
    await NiyantranTask.create(taskDoc.toObject());
    await TaskHistory.create(historyDoc.toObject());

    console.log('Persistence successful for all four documents.');
  } finally {
    await TaskHistory.collection.deleteOne({ _id: historyDoc._id });
    await NiyantranTask.deleteOne({ _id: taskDoc._id });
    await NiyantranNDA.deleteOne({ _id: ndaDoc._id });
    await Candidate.deleteOne({ _id: candidateDoc._id });
    await mongoose.disconnect();
    console.log('Smoke-test documents cleaned up and MongoDB connection closed.');
  }
}

run().catch(async (error) => {
  console.error('Phase 1 smoke test failed:', error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
