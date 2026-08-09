import PDFDocument from 'pdfkit';
import { toBuffer as qrToBuffer } from './qrService.js';

export async function generateAdmissionReceipt(data) {
  return new Promise((resolve, reject) => {
    try {
      const { student, payment } = data;
      const PAGE_W = 288;
      const PAGE_H = 432;
      const MARGIN = 16;
      const CONTENT_W = PAGE_W - MARGIN * 2;

      const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });
      const buffers = [];
      doc.on('data', c => buffers.push(c));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const primary = '#1b365d';
      const dark = '#0f172a';
      const muted = '#64748b';
      const paidBg = '#ebf8ff';
      const paidBdr = '#90cdf4';
      const paidTxt = '#2b6cb0';

      // Header section
      doc.rect(0, 0, PAGE_W, 64).fill(primary);
      doc.roundedRect(MARGIN, 12, 34, 34, 5).fill('#fff');
      doc.font('Helvetica-Bold').fontSize(13).fillColor(primary)
         .text('DDL', MARGIN, 22, { width: 34, align: 'center' });
      const tx = MARGIN + 44, tw = PAGE_W - tx - MARGIN;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
         .text('DURGA DIGITAL LIBRARY', tx, 18, { width: tw });
      doc.font('Helvetica').fontSize(6).fillColor('#bcd0e8')
         .text('Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211', tx, 32, { width: tw });
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#fff')
         .text('Contact: Saurav Kumar (7542893960)', tx, 44, { width: tw });

      // Receipt title
      doc.rect(0, 64, PAGE_W, 18).fill('#ebf4ff');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0c447c')
         .text('ADMISSION RECEIPT', 0, 69, { width: PAGE_W, align: 'center' });

      let y = 92;
      const row = (label, value) => {
        doc.font('Helvetica').fontSize(7).fillColor(muted)
           .text(label.toUpperCase(), MARGIN, y);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(dark)
           .text(String(value || 'N/A'), 0, y, { width: PAGE_W - MARGIN, align: 'right' });
        y += 18;
      };

      row('Receipt No', payment?.receiptNo || 'N/A');
      row('Date', payment?.paidOn || new Date().toLocaleDateString('en-IN'));
      row('Student Name', student?.name);
      row('Mobile', student?.mobile);
      row('Seat Code', student?.seatCode || 'N/A');
      row('Shift', student?.shift || 'N/A');
      row('Joining Date', student?.joiningDate || 'N/A');
      row('Expiry Date', student?.expiryDate || 'N/A');
      row('Duration', student?.duration || 'N/A');

      y += 4;
      doc.roundedRect(MARGIN, y, CONTENT_W, 34, 6)
         .fill(paidBg).strokeColor(paidBdr).lineWidth(1).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(paidTxt)
         .text('ADMISSION FEE', MARGIN + 12, y + 12);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(paidTxt)
         .text(`Rs. ${payment?.amount || student?.fee || 0}`,
               0, y + 9, { width: PAGE_W - MARGIN - 12, align: 'right' });

      y += 48;
      doc.font('Helvetica-Oblique').fontSize(5.5).fillColor('#a0aec0')
         .text('This is a system-generated digital receipt.', MARGIN, y, { width: CONTENT_W, align: 'center' });
      doc.rect(0, PAGE_H - 8, PAGE_W, 8).fill(primary);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateRenewalReceipt(data) {
  return new Promise((resolve, reject) => {
    try {
      const { student, membership, payment } = data;
      const PAGE_W = 288;
      const PAGE_H = 432;
      const MARGIN = 16;
      const CONTENT_W = PAGE_W - MARGIN * 2;

      const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });
      const buffers = [];
      doc.on('data', c => buffers.push(c));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const primary = '#1b365d';
      const dark = '#0f172a';
      const muted = '#64748b';
      const paidBg = '#ebf8ff';
      const paidBdr = '#90cdf4';
      const paidTxt = '#2b6cb0';

      doc.rect(0, 0, PAGE_W, 64).fill(primary);
      doc.roundedRect(MARGIN, 12, 34, 34, 5).fill('#fff');
      doc.font('Helvetica-Bold').fontSize(13).fillColor(primary)
         .text('DDL', MARGIN, 22, { width: 34, align: 'center' });
      const tx = MARGIN + 44, tw = PAGE_W - tx - MARGIN;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
         .text('DURGA DIGITAL LIBRARY', tx, 18, { width: tw });
      doc.font('Helvetica').fontSize(6).fillColor('#bcd0e8')
         .text('Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211', tx, 32, { width: tw });
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#fff')
         .text('Contact: Saurav Kumar (7542893960)', tx, 44, { width: tw });

      doc.rect(0, 64, PAGE_W, 18).fill('#ebf4ff');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0c447c')
         .text('MEMBERSHIP RENEWAL RECEIPT', 0, 69, { width: PAGE_W, align: 'center' });

      let y = 92;
      const row = (label, value) => {
        doc.font('Helvetica').fontSize(7).fillColor(muted)
           .text(label.toUpperCase(), MARGIN, y);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(dark)
           .text(String(value || 'N/A'), 0, y, { width: PAGE_W - MARGIN, align: 'right' });
        y += 18;
      };

      row('Receipt No', payment?.receiptNo || 'N/A');
      row('Date', payment?.paidOn || new Date().toLocaleDateString('en-IN'));
      row('Student Name', student?.name);
      row('Student ID', student?.studentId || 'N/A');
      row('Mobile', student?.mobile);
      row('Seat Code', student?.seatCode || 'N/A');
      row('Shift', student?.shift || 'N/A');
      row('New Expiry', membership?.expiryDate || 'N/A');
      row('Duration', membership?.duration || 'N/A');

      y += 4;
      doc.roundedRect(MARGIN, y, CONTENT_W, 34, 6)
         .fill(paidBg).strokeColor(paidBdr).lineWidth(1).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(paidTxt)
         .text('RENEWAL FEE', MARGIN + 12, y + 12);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(paidTxt)
         .text(`Rs. ${payment?.amount || membership?.fee || 0}`,
               0, y + 9, { width: PAGE_W - MARGIN - 12, align: 'right' });

      y += 48;
      doc.font('Helvetica-Oblique').fontSize(5.5).fillColor('#a0aec0')
         .text('This is a system-generated digital receipt.', MARGIN, y, { width: CONTENT_W, align: 'center' });
      doc.rect(0, PAGE_H - 8, PAGE_W, 8).fill(primary);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateStudentIdCard(student, qrDataUrl) {
  const W = 420, H = 298, M = 14;
  const primary = '#1b365d';
  const accent = '#dc2626';

  const doc = new PDFDocument({ size: [W, H], margin: 0 });
  const buffers = [];
  doc.on('data', c => buffers.push(c));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      doc.rect(0, 0, W, H).fill('#f8fafc');
      doc.rect(0, 0, 8, H).fill(primary);
      doc.rect(8, 0, W - 8, 52).fill(primary);

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff')
         .text('DURGA DIGITAL LIBRARY', 18, 10, { width: W - 36 });
      doc.font('Helvetica').fontSize(7).fillColor('#bcd0e8')
         .text('Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211', 18, 28, { width: W - 36 });
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#e2e8f0')
         .text('STUDENT IDENTITY CARD', 18, 40, { width: W - 36 });

      const qrSize = 110;
      const qrX = W - M - qrSize;
      const qrY = 62;
      if (qrDataUrl) {
        const qrBuf = Buffer.from(qrDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });
      }
      doc.font('Helvetica').fontSize(6).fillColor('#64748b')
         .text('Scan to verify', qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });

      let y = 62;
      const col1 = 18, col2 = 110;

      const field = (label, value) => {
        doc.font('Helvetica').fontSize(7).fillColor('#64748b')
           .text(label, col1, y);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
           .text(String(value || '—'), col2, y);
        y += 18;
      };

      field('Name', student.name);
      field('Student ID', student.studentId || 'N/A');
      field('Mobile', student.mobile || 'N/A');
      field('Seat', student.seatCode || 'N/A');
      field('Shift', student.shift || 'N/A');
      field('Valid Until', student.expiryDate || 'N/A');

      const statusColor = student.status === 'Active' ? '#15803d' : '#dc2626';
      const statusBg = student.status === 'Active' ? '#dcfce7' : '#fee2e2';
      doc.roundedRect(col1, y, 80, 18, 4).fill(statusBg);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(statusColor)
         .text(student.status || 'Active', col1, y + 5, { width: 80, align: 'center' });

      doc.rect(0, H - 24, W, 24).fill(primary);
      doc.font('Helvetica').fontSize(6.5).fillColor('#e2e8f0')
         .text('This card is the property of Durga Digital Library. If found, please return.', M, H - 16, { width: W - M * 2, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
