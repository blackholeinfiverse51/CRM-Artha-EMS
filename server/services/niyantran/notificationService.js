const nodemailer = require('nodemailer');
const {
  Candidate,
  NiyantranTask,
  NiyantranNDA,
  TaskHistory,
} = require('../../models/niyantran');
const { logAction, resolveTraceId } = require('./auditService');

function isEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || '').trim());
}

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { skipped: true, reason: 'Email transporter not configured' };
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });

  return { skipped: false, messageId: info.messageId };
}

function buildTaskAssignedTemplate(candidate, task) {
  return {
    subject: `Task Assigned: ${task.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #1f2937;">New Task Assigned</h2>
        <p>Hello ${candidate.name},</p>
        <p>You have been assigned a new task in Niyantran.</p>
        <ul>
          <li><strong>Task:</strong> ${task.title}</li>
          <li><strong>Description:</strong> ${task.description}</li>
          <li><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toUTCString() : 'Not set'}</li>
        </ul>
      </div>
    `,
  };
}

function buildTaskSubmittedTemplate(candidate, task) {
  return {
    subject: `Task Submitted by ${candidate.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Task Submitted</h2>
        <p>Candidate <strong>${candidate.name}</strong> has submitted task <strong>${task.title}</strong>.</p>
        <p>Please review the submission in Niyantran.</p>
      </div>
    `,
  };
}

function buildTaskDueReminderTemplate(candidate, task) {
  return {
    subject: `Reminder: Task Due Soon (${task.title})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Task Due Reminder</h2>
        <p>Hello ${candidate.name},</p>
        <p>Your task <strong>${task.title}</strong> is due within the next 24 hours.</p>
        <p><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toUTCString() : 'Not set'}</p>
      </div>
    `,
  };
}

function buildNdaPendingReminderTemplate(candidate, nda) {
  return {
    subject: `Reminder: NDA Pending (${nda.ndaId})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #1f2937;">NDA Pending Reminder</h2>
        <p>Hello ${candidate.name},</p>
        <p>Your NDA <strong>${nda.ndaId}</strong> is still pending. Please sign and submit it to proceed.</p>
      </div>
    `,
  };
}

class NotificationService {
  async trigger(eventType, candidateId, data = {}) {
    const traceId = resolveTraceId(data.trace_id);
    const candidate = await Candidate.findById(candidateId).lean();

    if (!candidate) {
      throw new Error('Candidate not found for notification');
    }

    let emailResult = null;

    if (eventType === 'task_assigned') {
      const task = data.task;
      if (!task) {
        throw new Error('task_assigned notification requires task payload');
      }

      if (isEmail(candidate.email)) {
        const template = buildTaskAssignedTemplate(candidate, task);
        emailResult = await sendEmail({ to: candidate.email, ...template });
      }
    }

    if (eventType === 'task_submitted') {
      const task = data.task;
      if (!task) {
        throw new Error('task_submitted notification requires task payload');
      }

      const recruiterEmail = isEmail(data.recruiterEmail)
        ? data.recruiterEmail
        : (isEmail(task.assignedBy) ? task.assignedBy : process.env.EMAIL_USER);

      if (isEmail(recruiterEmail)) {
        const template = buildTaskSubmittedTemplate(candidate, task);
        emailResult = await sendEmail({ to: recruiterEmail, ...template });
      }
    }

    if (eventType === 'task_due_reminder') {
      const task = data.task;
      if (!task) {
        throw new Error('task_due_reminder notification requires task payload');
      }

      if (isEmail(candidate.email)) {
        const template = buildTaskDueReminderTemplate(candidate, task);
        emailResult = await sendEmail({ to: candidate.email, ...template });
      }
    }

    if (eventType === 'nda_pending_reminder') {
      const nda = data.nda;
      if (!nda) {
        throw new Error('nda_pending_reminder notification requires nda payload');
      }

      if (isEmail(candidate.email)) {
        const template = buildNdaPendingReminderTemplate(candidate, nda);
        emailResult = await sendEmail({ to: candidate.email, ...template });
      }
    }

    await logAction({
      candidateId,
      action: `notification_${eventType}`,
      fromState: candidate.status,
      toState: candidate.status,
      performedBy: data.performedBy || 'system',
      trace_id: traceId,
      metadata: {
        emailResult,
      },
    });

    return {
      eventType,
      candidateId,
      emailResult,
      trace_id: traceId,
    };
  }

  async processTaskDueReminders() {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueTasks = await NiyantranTask.find({
      isActive: true,
      dueDate: {
        $gte: now,
        $lte: in24Hours,
      },
    }).lean();

    const results = [];

    for (const task of dueTasks) {
      const sentRecently = await TaskHistory.findOne({
        candidateId: task.candidateId,
        taskId: task._id,
        action: 'task_due_reminder',
        performed_at: { $gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
      }).lean();

      if (sentRecently) {
        continue;
      }

      const notifyResult = await this.trigger('task_due_reminder', String(task.candidateId), {
        task,
        performedBy: 'system',
      });

      await TaskHistory.create({
        historyId: `TH-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 90000) + 10000}`,
        candidateId: task.candidateId,
        taskId: task._id,
        fromState: task.status,
        toState: task.status,
        action: 'task_due_reminder',
        reason: null,
        performed_by: 'system',
        performed_at: new Date(),
        trace_id: notifyResult.trace_id,
        metadata: { eventType: 'task_due_reminder' },
      });

      results.push(notifyResult);
    }

    return results;
  }

  async processNdaPendingReminders() {
    const now = new Date();
    const pendingNdas = await NiyantranNDA.find({ status: 'pending' }).lean();

    const results = [];

    for (const nda of pendingNdas) {
      const sentRecently = await TaskHistory.findOne({
        candidateId: nda.candidateId,
        taskId: null,
        action: 'nda_pending_reminder',
        performed_at: { $gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
      }).lean();

      if (sentRecently) {
        continue;
      }

      const notifyResult = await this.trigger('nda_pending_reminder', String(nda.candidateId), {
        nda,
        performedBy: 'system',
      });

      await TaskHistory.create({
        historyId: `TH-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 90000) + 10000}`,
        candidateId: nda.candidateId,
        taskId: null,
        fromState: 'NDA_PENDING',
        toState: 'NDA_PENDING',
        action: 'nda_pending_reminder',
        reason: null,
        performed_by: 'system',
        performed_at: new Date(),
        trace_id: notifyResult.trace_id,
        metadata: { eventType: 'nda_pending_reminder', ndaId: nda.ndaId },
      });

      results.push(notifyResult);
    }

    return results;
  }
}

module.exports = new NotificationService();
