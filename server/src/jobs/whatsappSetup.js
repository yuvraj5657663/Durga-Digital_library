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
    authStrategy: 'local',
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
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
