import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import config from '../config/index.js';
import logger from '../config/logger.js';

let whatsappClient = null;
let isWaReady = false;

export async function setupWhatsApp() {
  if (config.whatsapp.disabled) {
    logger.info('WhatsApp client disabled');
    return null;
  }

  try {
    whatsappClient = new Client({
      authStrategy: {
        type: 'local',
        dataPath: './.wwebjs_auth'
      },
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    });

    whatsappClient.on('qr', (qr) => {
      logger.info('================ WA QR CODE ================');
      qrcode.generate(qr, { small: true });
      logger.info('============================================');
    });

    whatsappClient.on('ready', () => {
      isWaReady = true;
      logger.info('✅ WhatsApp Client connected and READY!');
      console.log('[WhatsApp] Client is ready and authenticated');
    });

    whatsappClient.on('authenticated', () => {
      logger.info('✅ WhatsApp Client authenticated successfully');
      console.log('[WhatsApp] Authentication successful - session saved');
    });

    whatsappClient.on('auth_failure', (msg) => { 
      isWaReady = false; 
      logger.error('❌ WhatsApp authentication failed:', msg);
      console.error('[WhatsApp] Authentication failed:', msg);
    });
    
    whatsappClient.on('disconnected', (reason) => { 
      isWaReady = false; 
      logger.warn('⚠️ WhatsApp disconnected:', reason);
      console.warn('[WhatsApp] Client disconnected:', reason);
    });

    // Make client globally available for services
    global.whatsappClient = whatsappClient;

    await whatsappClient.initialize();
    logger.info('WhatsApp client initialization started');
    
    return whatsappClient;
  } catch (err) {
    logger.error('WhatsApp client initialization failed:', err);
    throw err;
  }
}

export function getWhatsAppClient() {
  return whatsappClient;
}

export function isWhatsAppReady() {
  return isWaReady;
}
