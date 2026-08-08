import QRCode from 'qrcode';
import config from '../config/index.js';

export async function toDataURL(data, opts = {}) {
  return QRCode.toDataURL(String(data), {
    width: opts.width || 256,
    margin: opts.margin || 2,
    color: {
      dark: opts.dark || '#1b365d',
      light: opts.light || '#ffffff'
    },
    errorCorrectionLevel: opts.ecl || 'M'
  });
}

export async function toBuffer(data, opts = {}) {
  return QRCode.toBuffer(String(data), {
    width: opts.width || 256,
    margin: opts.margin || 2,
    type: 'png',
    errorCorrectionLevel: opts.ecl || 'M'
  });
}

export function buildStudentQrPayload(studentId, baseUrl) {
  const base = (baseUrl || config.app.url).replace(/\/$/, '');
  return `${base}/portal?student=${encodeURIComponent(studentId)}`;
}

export function buildAttendanceQrPayload(studentId, date, baseUrl) {
  const base = (baseUrl || config.app.url).replace(/\/$/, '');
  return `${base}/api/v1/student/attendance/scan?sid=${encodeURIComponent(studentId)}&date=${encodeURIComponent(date || '')}`;
}
