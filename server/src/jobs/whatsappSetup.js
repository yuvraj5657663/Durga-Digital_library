import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import config from '../config/index.js';
import logger from '../config/logger.js';

let whatsappClient = null;
let isWaReady = false;

export function setupWhatsApp() {
  if (config.whatsapp.disabled) {
    logger.info('WhatsApp client disabled');
    return null;
  }

  whatsappClient = new Client({
    puppeteer: { 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
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
  });

  whatsappClient.on('auth_failure', () => { 
    isWaReady = false; 
    logger.warn('WhatsApp authentication failed');
  });
  
  whatsappClient.on('disconnected', () => { 
    isWaReady = false; 
    logger.warn('WhatsApp disconnected');
  });

  whatsappClient.initialize().catch(err => {
    logger.error('WhatsApp Initialization error:', err);
  });

  // Make client globally available for services
  global.whatsappClient = whatsappClient;

  return whatsappClient;
}

export function getWhatsAppClient() {
  return whatsappClient;
}

export function isWhatsAppReady() {
  return isWaReady;
}
