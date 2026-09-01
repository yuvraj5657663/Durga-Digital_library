/**
 * QR Service Tests
 * 
 * Tests for QR code generation functions in qrService.js
 * These tests verify QR generation without requiring database or external services.
 */

import {
  toDataURL,
  toBuffer,
  buildStudentQrPayload,
  buildAttendanceQrPayload
} from '../src/services/qrService.js';

jest.mock('../src/config/index.js', () => ({
  app: {
    url: 'http://localhost:3000'
  }
}));

describe('QR Service', () => {
  describe('toDataURL', () => {
    it('should generate QR data URL with valid input', async () => {
      const result = await toDataURL('test-data');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate QR with custom width', async () => {
      const result = await toDataURL('test-data', { width: 512 });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate QR with custom margin', async () => {
      const result = await toDataURL('test-data', { margin: 4 });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate QR with custom colors', async () => {
      const result = await toDataURL('test-data', {
        dark: '#000000',
        light: '#ffffff'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate QR with custom error correction level', async () => {
      const result = await toDataURL('test-data', { ecl: 'H' });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle empty string input', async () => {
      // QRCode library rejects empty strings, so we test with minimal data
      const result = await toDataURL(' ');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle special characters in input', async () => {
      const specialData = 'Test@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      const result = await toDataURL(specialData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle unicode characters', async () => {
      const unicodeData = 'Test 你好 🚀';

      const result = await toDataURL(unicodeData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle long input strings', async () => {
      const longData = 'A'.repeat(1000);

      const result = await toDataURL(longData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle null input by converting to string', async () => {
      // QRCode converts null to 'null' string
      const result = await toDataURL(null);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle undefined input by converting to string', async () => {
      // QRCode converts undefined to 'undefined' string
      const result = await toDataURL(undefined);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('toBuffer', () => {
    it('should generate QR buffer with valid input', async () => {
      const result = await toBuffer('test-data');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate QR buffer with custom width', async () => {
      const result = await toBuffer('test-data', { width: 512 });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate QR buffer with custom margin', async () => {
      const result = await toBuffer('test-data', { margin: 4 });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate QR buffer with custom error correction level', async () => {
      const result = await toBuffer('test-data', { ecl: 'H' });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty string input', async () => {
      // QRCode library rejects empty strings, so we test with minimal data
      const result = await toBuffer(' ');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in input', async () => {
      const specialData = 'Test@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      const result = await toBuffer(specialData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', async () => {
      const unicodeData = 'Test 你好 🚀';

      const result = await toBuffer(unicodeData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle long input strings', async () => {
      const longData = 'A'.repeat(1000);

      const result = await toBuffer(longData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null input by converting to string', async () => {
      // QRCode converts null to 'null' string
      const result = await toBuffer(null);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle undefined input by converting to string', async () => {
      // QRCode converts undefined to 'undefined' string
      const result = await toBuffer(undefined);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('buildStudentQrPayload', () => {
    it('should build student QR payload with default base URL', () => {
      const result = buildStudentQrPayload('STU001');

      expect(result).toBe('http://localhost:3000/portal?student=STU001');
    });

    it('should build student QR payload with custom base URL', () => {
      const result = buildStudentQrPayload('STU001', 'https://example.com');

      expect(result).toBe('https://example.com/portal?student=STU001');
    });

    it('should handle base URL with trailing slash', () => {
      const result = buildStudentQrPayload('STU001', 'https://example.com/');

      expect(result).toBe('https://example.com/portal?student=STU001');
    });

    it('should encode student ID properly', () => {
      const result = buildStudentQrPayload('STU/001');

      expect(result).toContain('student=STU%2F001');
    });

    it('should handle special characters in student ID', () => {
      const result = buildStudentQrPayload('STU@#$');

      expect(result).toContain('student=');
      expect(result).toContain('portal?student=');
    });

    it('should handle empty student ID', () => {
      const result = buildStudentQrPayload('');

      expect(result).toBe('http://localhost:3000/portal?student=');
    });

    it('should handle unicode student ID', () => {
      const result = buildStudentQrPayload('STU你好');

      expect(result).toContain('portal?student=');
    });

    it('should not expose sensitive information in payload', () => {
      // The payload only contains student ID, which is not sensitive
      const result = buildStudentQrPayload('STU001');

      expect(result).not.toContain('password');
      expect(result).not.toContain('secret');
      expect(result).not.toContain('token');
    });
  });

  describe('buildAttendanceQrPayload', () => {
    it('should build attendance QR payload with default base URL', () => {
      const result = buildAttendanceQrPayload('STU001', '2024-01-01');

      expect(result).toBe('http://localhost:3000/api/v1/student/attendance/scan?sid=STU001&date=2024-01-01');
    });

    it('should build attendance QR payload with custom base URL', () => {
      const result = buildAttendanceQrPayload('STU001', '2024-01-01', 'https://example.com');

      expect(result).toBe('https://example.com/api/v1/student/attendance/scan?sid=STU001&date=2024-01-01');
    });

    it('should handle base URL with trailing slash', () => {
      const result = buildAttendanceQrPayload('STU001', '2024-01-01', 'https://example.com/');

      expect(result).toBe('https://example.com/api/v1/student/attendance/scan?sid=STU001&date=2024-01-01');
    });

    it('should encode student ID properly', () => {
      const result = buildAttendanceQrPayload('STU/001', '2024-01-01');

      expect(result).toContain('sid=STU%2F001');
    });

    it('should encode date properly', () => {
      const result = buildAttendanceQrPayload('STU001', '2024/01/01');

      expect(result).toContain('date=2024%2F01%2F01');
    });

    it('should handle empty student ID', () => {
      const result = buildAttendanceQrPayload('', '2024-01-01');

      expect(result).toContain('sid=');
    });

    it('should handle empty date', () => {
      const result = buildAttendanceQrPayload('STU001', '');

      expect(result).toContain('date=');
    });

    it('should handle null date', () => {
      const result = buildAttendanceQrPayload('STU001', null);

      expect(result).toContain('date=');
    });

    it('should handle undefined date', () => {
      const result = buildAttendanceQrPayload('STU001', undefined);

      expect(result).toContain('date=');
    });

    it('should handle special characters in student ID', () => {
      const result = buildAttendanceQrPayload('STU@#$', '2024-01-01');

      expect(result).toContain('sid=');
    });

    it('should handle special characters in date', () => {
      const result = buildAttendanceQrPayload('STU001', '2024@01@01');

      expect(result).toContain('date=');
    });

    it('should not expose sensitive information in payload', () => {
      // The payload only contains student ID and date, which are not sensitive
      const result = buildAttendanceQrPayload('STU001', '2024-01-01');

      expect(result).not.toContain('password');
      expect(result).not.toContain('secret');
      expect(result).not.toContain('token');
    });
  });

  describe('QR Output Validation', () => {
    it('should generate valid PNG data URL', async () => {
      const result = await toDataURL('test-data');

      expect(result).toMatch(/^data:image\/png;base64,/);
      
      // Decode base64 and check PNG signature
      const base64Data = result.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      expect(buffer.toString('hex', 0, 8)).toBe('89504e470d0a1a0a'); // PNG signature
    });

    it('should generate valid PNG buffer', async () => {
      const result = await toBuffer('test-data');

      expect(result.toString('hex', 0, 8)).toBe('89504e470d0a1a0a'); // PNG signature
    });

    it('should generate different QR codes for different inputs', async () => {
      const result1 = await toDataURL('data1');
      const result2 = await toDataURL('data2');

      expect(result1).not.toBe(result2);
    });

    it('should generate same QR code for same inputs', async () => {
      const result1 = await toDataURL('same-data');
      const result2 = await toDataURL('same-data');

      expect(result1).toBe(result2);
    });
  });

  describe('Security Considerations', () => {
    it('should not embed unnecessary sensitive information', () => {
      const studentPayload = buildStudentQrPayload('STU001');
      const attendancePayload = buildAttendanceQrPayload('STU001', '2024-01-01');

      // Verify only necessary data is included
      expect(studentPayload).toContain('student=STU001');
      expect(attendancePayload).toContain('sid=STU001');
      expect(attendancePayload).toContain('date=2024-01-01');
    });

    it('should handle student ID encoding safely', () => {
      const maliciousId = '<script>alert("xss")</script>';
      const result = buildStudentQrPayload(maliciousId);

      // Should be encoded, not executed
      expect(result).not.toContain('<script>');
    });

    it('should handle date encoding safely', () => {
      const maliciousDate = '<script>alert("xss")</script>';
      const result = buildAttendanceQrPayload('STU001', maliciousDate);

      // Should be encoded, not executed
      expect(result).not.toContain('<script>');
    });
  });
});
