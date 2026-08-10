import cron from 'node-cron';
import { expireStale, findExpiringSoon } from '../services/membershipService.js';
import { sendRenewalReminder, checkAndSendShiftEndNotifications } from '../services/notificationService.js';
import logger from '../config/logger.js';

export function startCronJobs() {
  // Run every day at midnight to expire stale memberships
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running membership expiry check...');
      const expiredCount = await expireStale();
      logger.info(`Expired ${expiredCount} memberships`);
    } catch (error) {
      logger.error('Membership expiry check failed:', error);
    }
  });

  // Run every day at 9 AM to send renewal reminders
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Sending renewal reminders...');
      const expiringStudents = await findExpiringSoon(5);
      
      for (const student of expiringStudents) {
        const daysLeft = Math.ceil(
          (new Date(student.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysLeft > 0 && daysLeft <= 5) {
          await sendRenewalReminder({ student, daysLeft });
          logger.info(`Renewal reminder sent to ${student.name}`);
        }
      }
      
      logger.info(`Renewal reminders sent to ${expiringStudents.length} students`);
    } catch (error) {
      logger.error('Renewal reminder job failed:', error);
    }
  });

  // Shift end notification jobs
  // Shift 1 ends at 11:00 AM
  cron.schedule('0 11 * * *', async () => {
    try {
      logger.info('Sending Shift 1 end notifications...');
      const notifications = await checkAndSendShiftEndNotifications();
      logger.info(`Shift 1 end notifications sent: ${notifications.length}`);
    } catch (error) {
      logger.error('Shift 1 end notification job failed:', error);
    }
  });

  // Shift 2 ends at 4:00 PM (16:00)
  cron.schedule('0 16 * * *', async () => {
    try {
      logger.info('Sending Shift 2 end notifications...');
      const notifications = await checkAndSendShiftEndNotifications();
      logger.info(`Shift 2 end notifications sent: ${notifications.length}`);
    } catch (error) {
      logger.error('Shift 2 end notification job failed:', error);
    }
  });

  // Shift 3 ends at 9:00 PM (21:00)
  cron.schedule('0 21 * * *', async () => {
    try {
      logger.info('Sending Shift 3 end notifications...');
      const notifications = await checkAndSendShiftEndNotifications();
      logger.info(`Shift 3 end notifications sent: ${notifications.length}`);
    } catch (error) {
      logger.error('Shift 3 end notification job failed:', error);
    }
  });

  // Night Shift ends at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    try {
      logger.info('Sending Night Shift end notifications...');
      const notifications = await checkAndSendShiftEndNotifications();
      logger.info(`Night Shift end notifications sent: ${notifications.length}`);
    } catch (error) {
      logger.error('Night Shift end notification job failed:', error);
    }
  });

  logger.info('Cron jobs started');
}
