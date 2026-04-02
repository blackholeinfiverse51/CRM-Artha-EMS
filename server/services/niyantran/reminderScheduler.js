const cron = require('node-cron');
const notificationService = require('./notificationService');

let schedulerStarted = false;

function startNiyantranReminderJobs() {
  if (schedulerStarted) {
    return;
  }

  // Every hour: task due reminders within next 24h.
  cron.schedule('0 * * * *', async () => {
    try {
      await notificationService.processTaskDueReminders();
    } catch (error) {
      console.error('Task due reminder job failed:', error.message);
    }
  });

  // Every day at 10 AM UTC: NDA pending reminders.
  cron.schedule('0 10 * * *', async () => {
    try {
      await notificationService.processNdaPendingReminders();
    } catch (error) {
      console.error('NDA pending reminder job failed:', error.message);
    }
  });

  schedulerStarted = true;
  console.log('Niyantran reminder jobs started');
}

module.exports = {
  startNiyantranReminderJobs,
};
