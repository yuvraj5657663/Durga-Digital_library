#!/usr/bin/env node
/**
 * Test Script for Email and WhatsApp Notifications
 * 
 * Usage:
 *   node scripts/testNotifications.js --email test@example.com
 *   node scripts/testNotifications.js --whatsapp 919876543210
 *   node scripts/testNotifications.js --both test@example.com 919876543210
 * 
 * This script tests the notification system independently of the main application.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import nodemailer from 'nodemailer';
import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// Configuration
const config = {
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  },
  whatsapp: {
    disabled: process.env.WHATSAPP_ENABLED === 'false' || 
              process.env.WHATSAPP_ENABLED === false ||
              process.env.DISABLE_WHATSAPP === 'true' ||
              !process.env.WHATSAPP_ENABLED,
  }
};

// Email Test Function
async function testEmail(toEmail) {
  console.log('\n=== Testing Email Configuration ===');
  console.log('SMTP Host:', config.email.host);
  console.log('SMTP Port:', config.email.port);
  console.log('From:', config.email.from);
  console.log('To:', toEmail);

  if (!config.email.user || !config.email.pass) {
    console.error('❌ ERROR: EMAIL_USER or EMAIL_PASS not set in .env');
    return false;
  }

  if (config.email.port === 25) {
    console.error('❌ ERROR: EMAIL_PORT 25 is blocked by AWS. Use 587 or 465');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });

  try {
    console.log('\n📧 Attempting to send test email...');
    const info = await transporter.sendMail({
      from: config.email.from,
      to: toEmail,
      subject: '🧪 Test Email - Durga Digital Library',
      text: `This is a test email from Durga Digital Library notification system.\n\nIf you receive this, email configuration is working correctly!\n\nSent at: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1b365d;">🧪 Test Email - Durga Digital Library</h2>
          <p>This is a test email from Durga Digital Library notification system.</p>
          <p style="color: green; font-weight: bold;">✅ If you receive this, email configuration is working correctly!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    });
    console.log('✅ SUCCESS: Email sent!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return true;
  } catch (err) {
    console.error('❌ ERROR: Email failed to send');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.error('Command:', err.command);
    console.error('Response Code:', err.responseCode);
    console.error('Response:', err.response);
    return false;
  }
}

// WhatsApp Test Function
async function testWhatsApp(mobile) {
  console.log('\n=== Testing WhatsApp Configuration ===');
  console.log('WhatsApp Disabled:', config.whatsapp.disabled);
  console.log('Target Mobile:', mobile);

  if (config.whatsapp.disabled) {
    console.error('❌ ERROR: WhatsApp is disabled (WHATSAPP_ENABLED=false)');
    console.log('To enable: Set WHATSAPP_ENABLED=true in .env');
    return false;
  }

  const client = new Client({
    puppeteer: { 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    }
  });

  return new Promise((resolve) => {
    let qrReceived = false;
    let ready = false;

    client.on('qr', (qr) => {
      if (!qrReceived) {
        qrReceived = true;
        console.log('\n📱 Scan this QR code with WhatsApp (linked devices):');
        qrcode.generate(qr, { small: true });
        console.log('⏳ Waiting for authentication...');
      }
    });

    client.on('ready', () => {
      ready = true;
      console.log('✅ WhatsApp Client is ready!');
    });

    client.on('auth_failure', () => {
      console.error('❌ WhatsApp authentication failed');
      client.destroy();
      resolve(false);
    });

    client.on('disconnected', (reason) => {
      console.error('❌ WhatsApp disconnected:', reason);
      resolve(false);
    });

    client.initialize();

    // Wait for client to be ready, then send message
    const checkReady = setInterval(async () => {
      if (ready && client.info?.wid) {
        clearInterval(checkReady);
        try {
          const normalizedMobile = String(mobile).replace(/\D/g, '');
          const wid = normalizedMobile.length === 10 ? `91${normalizedMobile}@c.us` : `${normalizedMobile}@c.us`;
          
          console.log(`\n📱 Sending test message to ${wid}...`);
          await client.sendMessage(wid, '🧪 Test message from Durga Digital Library notification system.\n\nIf you receive this, WhatsApp integration is working!');
          console.log('✅ SUCCESS: WhatsApp message sent!');
          client.destroy();
          resolve(true);
        } catch (err) {
          console.error('❌ ERROR: WhatsApp message failed');
          console.error('Error:', err.message);
          client.destroy();
          resolve(false);
        }
      }
    }, 1000);

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!ready) {
        clearInterval(checkReady);
        console.error('❌ ERROR: WhatsApp client not ready within 60 seconds');
        console.log('Make sure to scan the QR code quickly');
        client.destroy();
        resolve(false);
      }
    }, 60000);
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const emailFlag = args.indexOf('--email');
  const whatsappFlag = args.indexOf('--whatsapp');
  const bothFlag = args.indexOf('--both');

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage:
  node scripts/testNotifications.js --email <email_address>
  node scripts/testNotifications.js --whatsapp <mobile_number>
  node scripts/testNotifications.js --both <email_address> <mobile_number>

Examples:
  node scripts/testNotifications.js --email test@example.com
  node scripts/testNotifications.js --whatsapp 919876543210
  node scripts/testNotifications.js --both test@example.com 919876543210

Note: For WhatsApp, ensure WHATSAPP_ENABLED=true in .env and scan QR code when prompted.
    `);
    process.exit(0);
  }

  let emailResult = null;
  let whatsappResult = null;

  if (bothFlag !== -1) {
    const email = args[bothFlag + 1];
    const mobile = args[bothFlag + 2];
    if (!email || !mobile) {
      console.error('❌ ERROR: --both requires email and mobile number');
      process.exit(1);
    }
    emailResult = await testEmail(email);
    whatsappResult = await testWhatsApp(mobile);
  } else if (emailFlag !== -1) {
    const email = args[emailFlag + 1];
    if (!email) {
      console.error('❌ ERROR: --email requires email address');
      process.exit(1);
    }
    emailResult = await testEmail(email);
  } else if (whatsappFlag !== -1) {
    const mobile = args[whatsappFlag + 1];
    if (!mobile) {
      console.error('❌ ERROR: --whatsapp requires mobile number');
      process.exit(1);
    }
    whatsappResult = await testWhatsApp(mobile);
  } else {
    console.error('❌ ERROR: Invalid arguments. Use --help for usage');
    process.exit(1);
  }

  // Summary
  console.log('\n=== Test Summary ===');
  if (emailResult !== null) {
    console.log('Email Test:', emailResult ? '✅ PASSED' : '❌ FAILED');
  }
  if (whatsappResult !== null) {
    console.log('WhatsApp Test:', whatsappResult ? '✅ PASSED' : '❌ FAILED');
  }

  process.exit((emailResult === false || whatsappResult === false) ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
