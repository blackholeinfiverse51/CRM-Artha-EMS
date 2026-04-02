const express = require('express');
const mongoose = require('mongoose');
const {
  Candidate,
  NiyantranNDA,
  NiyantranTask,
  TaskHistory,
} = require('../models/niyantran');
const { resolveTraceId } = require('../services/niyantran/auditService');

const router = express.Router();

function setTraceHeader(res, traceId) {
  if (traceId) {
    res.setHeader('X-Trace-ID', traceId);
  }
}

function applyReadPreference(query) {
  const readPreference = process.env.NIYANTRAN_SETU_READ_PREFERENCE;
  if (!readPreference) {
    return query;
  }

  return query.read(readPreference);
}

function shapeCandidateRow(candidate, task) {
  return {
    candidateId: candidate.candidateId,
    candidateObjectId: candidate._id,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
    status: candidate.status,
    ndaStatus: candidate.ndaStatus,
    currentTask: task
      ? {
          taskId: task.taskId,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate,
        }
      : null,
    updated_at: candidate.updated_at,
  };
}

router.get('/candidates', async (req, res) => {
  try {
    const traceId = resolveTraceId(req.header('x-trace-id'));

    const candidates = await applyReadPreference(
      Candidate.find({}).sort({ updated_at: -1 }).lean()
    );

    const currentTaskIds = candidates
      .map((candidate) => candidate.currentTaskId)
      .filter(Boolean);

    const tasks = currentTaskIds.length
      ? await applyReadPreference(NiyantranTask.find({ _id: { $in: currentTaskIds } }).lean())
      : [];

    const taskMap = new Map(tasks.map((task) => [String(task._id), task]));

    const rows = candidates.map((candidate) =>
      shapeCandidateRow(candidate, candidate.currentTaskId ? taskMap.get(String(candidate.currentTaskId)) : null)
    );

    setTraceHeader(res, traceId);
    return res.json({
      trace_id: traceId,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/candidates/:candidateId', async (req, res) => {
  try {
    const traceId = resolveTraceId(req.header('x-trace-id'));

    const candidateFilters = [{ candidateId: req.params.candidateId }];
    if (mongoose.Types.ObjectId.isValid(req.params.candidateId)) {
      candidateFilters.push({ _id: req.params.candidateId });
    }

    const candidate = await applyReadPreference(
      Candidate.findOne({
        $or: candidateFilters,
      }).lean()
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const task = candidate.currentTaskId
      ? await applyReadPreference(NiyantranTask.findById(candidate.currentTaskId).lean())
      : null;

    const nda = candidate.ndaDocumentId
      ? await applyReadPreference(NiyantranNDA.findById(candidate.ndaDocumentId).lean())
      : null;

    setTraceHeader(res, traceId);
    return res.json({
      trace_id: traceId,
      data: {
        ...shapeCandidateRow(candidate, task),
        nda: nda
          ? {
              ndaId: nda.ndaId,
              status: nda.status,
              fileUrl: nda.fileUrl,
              submittedAt: nda.submittedAt,
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const traceId = resolveTraceId(req.header('x-trace-id'));

    const tasks = await applyReadPreference(
      NiyantranTask.find({ isActive: true }).sort({ assignedAt: -1 }).lean()
    );

    const candidateIds = tasks.map((task) => task.candidateId);
    const candidates = candidateIds.length
      ? await applyReadPreference(Candidate.find({ _id: { $in: candidateIds } }).select('candidateId name status').lean())
      : [];

    const candidateMap = new Map(candidates.map((candidate) => [String(candidate._id), candidate]));

    const rows = tasks.map((task) => {
      const candidate = candidateMap.get(String(task.candidateId));
      return {
        taskId: task.taskId,
        candidateId: candidate ? candidate.candidateId : null,
        candidateName: candidate ? candidate.name : null,
        candidateStatus: candidate ? candidate.status : null,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
      };
    });

    setTraceHeader(res, traceId);
    return res.json({
      trace_id: traceId,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard-feed', async (req, res) => {
  try {
    const traceId = resolveTraceId(req.header('x-trace-id'));

    const [lastActions, pendingNdas, pendingSubmissions] = await Promise.all([
      applyReadPreference(
        TaskHistory.find({}).sort({ performed_at: -1 }).limit(10).lean()
      ),
      applyReadPreference(NiyantranNDA.countDocuments({ status: { $in: ['pending', 'signed'] } })),
      applyReadPreference(NiyantranTask.countDocuments({ status: 'SUBMITTED', isActive: false })),
    ]);

    setTraceHeader(res, traceId);
    return res.json({
      trace_id: traceId,
      data: {
        lastActions: lastActions.map((action) => ({
          historyId: action.historyId,
          candidateId: action.candidateId,
          taskId: action.taskId,
          action: action.action,
          fromState: action.fromState,
          toState: action.toState,
          performed_at: action.performed_at,
          trace_id: action.trace_id,
        })),
        pendingNdas,
        pendingSubmissions,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
