import cron from 'node-cron';
import { expireStale, findExpiringSoon } from '../services/membershipService.js';
import { sendRenewalReminder } from '../services/notificationService.js';
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

  logger.info('Cron jobs started');
}
