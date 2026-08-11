/**
 * whatsappSetup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises the whatsapp-web.js Client for EC2/Ubuntu production.
 *
 * ROOT CAUSE OF ORIGINAL BUG:
 *   authStrategy was passed as a plain object literal:
 *     authStrategy: { type: 'local', dataPath: '...' }
 *   whatsapp-web.js expects an *instance* of a strategy class.
 *   Passing a plain object causes an internal TypeError
 *   ("authStrategy.setup is not a function") which was caught by the global
 *   uncaughtException handler in index.js → process.exit(1) → server dies.
 *
 * KEY EC2 CHROMIUM FLAGS:
 *   --no-sandbox              Required: EC2 runs as root in many configs.
 *   --disable-setuid-sandbox  Required: companion to --no-sandbox.
 *   --disable-dev-shm-usage   Required: EC2 /dev/shm is only 64 MB by default;
 *                             Chromium crashes silently without this.
 *   --disable-gpu             No GPU on headless EC2.
 *   --single-process          Forces Chromium into a single process — critical
 *                             on low-memory instances to avoid OOM kills.
 *   --no-zygote               Disables Chromium's zygote fork model — required
 *                             when running --single-process on Linux.
 */

import { Client, LocalAuth } from 'whatsapp-web.js';  // LocalAuth must be imported as a CLASS
import qrcode from 'qrcode-terminal';
import config from '../config/index.js';
import logger from '../config/logger.js';

let whatsappClient = null;
let isWaReady      = false;

// ─────────────────────────────────────────────────────────────────────────────
// Main setup function — called from index.js AFTER app.listen() succeeds.
// Any error here is caught by the caller and logged; it NEVER kills the server.
// ─────────────────────────────────────────────────────────────────────────────
export async function setupWhatsApp() {
  if (config.whatsapp.disabled) {
    logger.info('[WA] WhatsApp client disabled — skipping setup');
    return null;
  }

  logger.info('[WA Step 1] Creating WhatsApp Client instance…');
  console.log('[WA Step 1] Creating WhatsApp Client instance…');

  try {
    // ── FIX: LocalAuth must be instantiated with `new`, not passed as a plain object ──
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'   // persists session across restarts
      }),
      puppeteer: {
        headless: true,
        // ── EC2/Ubuntu-specific Chromium flags ────────────────────────────────
        args: [
          '--no-sandbox',            // required on EC2 (often runs as root)
          '--disable-setuid-sandbox',// companion to --no-sandbox
          '--disable-dev-shm-usage', // /dev/shm is only 64 MB on EC2 — prevents Chromium crash
          '--disable-gpu',           // no GPU on headless server
          '--single-process',        // all Chromium work in one process — safe on low-RAM EC2
          '--no-zygote',             // required when --single-process is set on Linux
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
        ],
        // Let whatsapp-web.js use its own bundled Chromium by default.
        // Only override executablePath if you want to use the system Chromium:
        //   executablePath: '/usr/bin/chromium-browser',
      }
    });

    logger.info('[WA Step 2] Attaching event listeners…');
    console.log('[WA Step 2] Attaching event listeners…');

    // ── QR code: displayed in terminal so admin can scan from their phone ──
    whatsappClient.on('qr', (qr) => {
      console.log('\n================ WhatsApp QR CODE ================');
      console.log('Scan this QR code with your WhatsApp mobile app:');
      qrcode.generate(qr, { small: true });
      console.log('===================================================\n');
      logger.info('[WA] QR code generated — scan with WhatsApp mobile app');
    });

    // ── Authentication success ────────────────────────────────────────────────
    whatsappClient.on('authenticated', () => {
      logger.info('[WA] ✅ Authentication successful — session saved to .wwebjs_auth/');
      console.log('[WA] ✅ Authentication successful — session saved to .wwebjs_auth/');
    });

    // ── Client is fully ready and connected ───────────────────────────────────
    whatsappClient.on('ready', () => {
      isWaReady = true;
      global.isWaReady = true;

      const wid = whatsappClient.info?.wid?._serialized || 'unknown';
      logger.info(`[WA] ✅ WhatsApp Client is Ready! Connected as ${wid}`);
      console.log(`[WA] ✅ WhatsApp Client is Ready! Connected as ${wid}`);
    });

    // ── Auth failure — session corrupt, needs re-scan ─────────────────────────
    // Do NOT call process.exit() here — HTTP server must keep running
    whatsappClient.on('auth_failure', (msg) => {
      isWaReady = false;
      global.isWaReady = false;
      logger.error('[WA] ❌ Authentication failed:', msg);
      logger.error('[WA] Delete .wwebjs_auth/ folder and restart to re-scan QR');
      console.error('[WA] ❌ Authentication failed:', msg);
      console.error('[WA] Fix: rm -rf .wwebjs_auth/ && pm2 restart durga-library-server');
    });

    // ── Disconnected — could be temporary ────────────────────────────────────
    whatsappClient.on('disconnected', (reason) => {
      isWaReady = false;
      global.isWaReady = false;
      logger.warn('[WA] ⚠️  WhatsApp disconnected:', reason);
      console.warn('[WA] ⚠️  WhatsApp disconnected:', reason);
    });

    // ── Any internal client error ─────────────────────────────────────────────
    whatsappClient.on('error', (err) => {
      logger.error('[WA] Client error:', err?.message || err);
      console.error('[WA] Client error:', err?.message || err);
      // Do NOT propagate — HTTP server must keep running
    });

    // Make client globally accessible from services
    global.whatsappClient = whatsappClient;

    logger.info('[WA Step 3] Calling client.initialize()…');
    console.log('[WA Step 3] Calling client.initialize() — this may take 15–30 seconds on first run…');

    // initialize() resolves once Chromium is launched and the WA web session loads.
    // It does NOT wait for QR scan or the 'ready' event — those fire asynchronously.
    await whatsappClient.initialize();

    logger.info('[WA Step 4] client.initialize() resolved — waiting for QR scan or session restore…');
    console.log('[WA Step 4] client.initialize() resolved — waiting for QR / session restore…');

    return whatsappClient;

  } catch (err) {
    // Log the full error (including Chromium launch errors) but DO NOT re-throw
    // so that the caller in index.js doesn't propagate it to uncaughtException.
    logger.error('[WA] ❌ WhatsApp setup failed:', err.message);
    logger.error('[WA] Stack trace:', err.stack);
    console.error('[WA] ❌ WhatsApp setup failed:', err.message);
    console.error('[WA] Common causes:');
    console.error('  1. Chromium missing: sudo apt-get install -y chromium-browser');
    console.error('  2. Missing system libs: sudo apt-get install -y libgbm-dev libasound2');
    console.error('  3. Low disk space or /dev/shm issues');
    console.error('  4. Session corrupt: rm -rf .wwebjs_auth/ and restart');
    console.error('[WA] HTTP server continues without WhatsApp.');

    global.whatsappClient = null;
    global.isWaReady = false;

    // Return null — caller in index.js handles null gracefully
    return null;
  }
}

export function getWhatsAppClient() {
  return whatsappClient;
}

export function isWhatsAppReady() {
  return isWaReady;
}
