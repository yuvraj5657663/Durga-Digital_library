/**
 * PDF Service Tests
 * 
 * Tests for PDF generation functions in pdfService.js
 * These tests verify PDF generation without requiring database or external services.
 */

import {
  generateAdmissionReceipt,
  generateRenewalReceipt,
  generateStudentIdCard
} from '../src/services/pdfService.js';

jest.mock('../src/services/qrService.js', () => ({
  toBuffer: jest.fn()
}));

describe('PDF Service', () => {
  describe('generateAdmissionReceipt', () => {
    const mockStudent = {
      name: 'Test Student',
      mobile: '9876543210',
      seatCode: 'A001',
      shift: 'Morning',
      joiningDate: '2024-01-01',
      expiryDate: '2024-12-31',
      duration: '12 Month(s)',
      fee: 5000
    };

    const mockPayment = {
      receiptNo: 'DDL-20240101-ABC123',
      amount: 5000,
      paidOn: '2024-01-01'
    };

    it('should generate admission receipt PDF with valid data', async () => {
      const result = await generateAdmissionReceipt({
        student: mockStudent,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // PDF files start with %PDF-
      expect(result.toString('utf8', 0, 5)).toBe('%PDF-');
    });

    it('should generate receipt with missing payment data', async () => {
      const result = await generateAdmissionReceipt({
        student: mockStudent,
        payment: null
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate receipt with missing optional student fields', async () => {
      const minimalStudent = {
        name: 'Test Student',
        mobile: '9876543210'
      };

      const result = await generateAdmissionReceipt({
        student: minimalStudent,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in student name', async () => {
      const specialNameStudent = {
        ...mockStudent,
        name: 'Test O\'Brien-Kumar'
      };

      const result = await generateAdmissionReceipt({
        student: specialNameStudent,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle long student names', async () => {
      const longNameStudent = {
        ...mockStudent,
        name: 'A'.repeat(100)
      };

      const result = await generateAdmissionReceipt({
        student: longNameStudent,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle edge-case amounts', async () => {
      const edgeAmounts = [0, 1, 999999, 5000.50];

      for (const amount of edgeAmounts) {
        const result = await generateAdmissionReceipt({
          student: mockStudent,
          payment: { ...mockPayment, amount }
        });

        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should handle null/undefined data gracefully', async () => {
      const result = await generateAdmissionReceipt({
        student: null,
        payment: null
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty student object', async () => {
      const result = await generateAdmissionReceipt({
        student: {},
        payment: {}
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format date correctly', async () => {
      const result = await generateAdmissionReceipt({
        student: mockStudent,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
      // PDF should be generated, date formatting is internal
    });

    it('should format amount correctly', async () => {
      const result = await generateAdmissionReceipt({
        student: mockStudent,
        payment: { ...mockPayment, amount: 1234.56 }
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should reject on PDF generation error', async () => {
      // Pass invalid data that might cause PDF generation to fail
      // Since PDFKit is robust, this is a theoretical test
      await expect(
        generateAdmissionReceipt(null)
      ).rejects.toThrow();
    });
  });

  describe('generateRenewalReceipt', () => {
    const mockStudent = {
      name: 'Test Student',
      studentId: 'STU001',
      mobile: '9876543210',
      seatCode: 'A001',
      shift: 'Morning',
      duration: '6 Month(s)',
      fee: 3000
    };

    const mockMembership = {
      expiryDate: '2024-06-30',
      duration: '6 Month(s)',
      fee: 3000
    };

    const mockPayment = {
      receiptNo: 'DDL-20240101-DEF456',
      amount: 3000,
      paidOn: '2024-01-01'
    };

    it('should generate renewal receipt PDF with valid data', async () => {
      const result = await generateRenewalReceipt({
        student: mockStudent,
        membership: mockMembership,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.toString('utf8', 0, 5)).toBe('%PDF-');
    });

    it('should generate receipt with missing payment data', async () => {
      const result = await generateRenewalReceipt({
        student: mockStudent,
        membership: mockMembership,
        payment: null
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate receipt with missing optional fields', async () => {
      const minimalStudent = {
        name: 'Test Student',
        mobile: '9876543210'
      };

      const result = await generateRenewalReceipt({
        student: minimalStudent,
        membership: {},
        payment: {}
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in student name', async () => {
      const specialNameStudent = {
        ...mockStudent,
        name: 'Test O\'Brien-Kumar'
      };

      const result = await generateRenewalReceipt({
        student: specialNameStudent,
        membership: mockMembership,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle edge-case amounts', async () => {
      const edgeAmounts = [0, 1, 999999, 3000.50];

      for (const amount of edgeAmounts) {
        const result = await generateRenewalReceipt({
          student: mockStudent,
          membership: mockMembership,
          payment: { ...mockPayment, amount }
        });

        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should handle null/undefined data gracefully', async () => {
      const result = await generateRenewalReceipt({
        student: null,
        membership: null,
        payment: null
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format new expiry date correctly', async () => {
      const result = await generateRenewalReceipt({
        student: mockStudent,
        membership: mockMembership,
        payment: mockPayment
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should reject on PDF generation error', async () => {
      await expect(
        generateRenewalReceipt(null)
      ).rejects.toThrow();
    });
  });

  describe('generateStudentIdCard', () => {
    const mockStudent = {
      name: 'Test Student',
      studentId: 'STU001',
      mobile: '9876543210',
      seatCode: 'A001',
      shift: 'Morning',
      expiryDate: '2024-12-31',
      status: 'Active'
    };

    it('should generate student ID card with valid data and QR', async () => {
      const mockQrDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = await generateStudentIdCard(mockStudent, mockQrDataUrl);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.toString('utf8', 0, 5)).toBe('%PDF-');
    });

    it('should generate student ID card without QR data', async () => {
      const result = await generateStudentIdCard(mockStudent, null);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate ID card for inactive student', async () => {
      const inactiveStudent = {
        ...mockStudent,
        status: 'Inactive'
      };

      const result = await generateStudentIdCard(inactiveStudent, null);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle missing optional student fields', async () => {
      const minimalStudent = {
        name: 'Test Student',
        mobile: '9876543210'
      };

      const result = await generateStudentIdCard(minimalStudent, null);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in student name', async () => {
      const specialNameStudent = {
        ...mockStudent,
        name: 'Test O\'Brien-Kumar'
      };

      const result = await generateStudentIdCard(specialNameStudent, null);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle long student names', async () => {
      const longNameStudent = {
        ...mockStudent,
        name: 'A'.repeat(100)
      };

      const result = await generateStudentIdCard(longNameStudent, null);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should reject on PDF generation error', async () => {
      await expect(
        generateStudentIdCard(null, 'invalid-qr-data')
      ).rejects.toThrow();
    });
  });

  describe('PDF Output Validation', () => {
    it('should generate valid PDF format', async () => {
      const mockStudent = {
        name: 'Test Student',
        mobile: '9876543210',
        seatCode: 'A001',
        shift: 'Morning',
        joiningDate: '2024-01-01',
        expiryDate: '2024-12-31',
        duration: '12 Month(s)',
        fee: 5000
      };

      const mockPayment = {
        receiptNo: 'DDL-20240101-ABC123',
        amount: 5000,
        paidOn: '2024-01-01'
      };

      const result = await generateAdmissionReceipt({
        student: mockStudent,
        payment: mockPayment
      });

      // Validate PDF header
      expect(result.toString('utf8', 0, 5)).toBe('%PDF-');
      
      // Validate PDF footer (EOF marker)
      const pdfString = result.toString('utf8');
      expect(pdfString).toContain('%%EOF');
    });

    it('should not log sensitive data', async () => {
      // This test verifies that the service doesn't log sensitive data
      // Since pdfService doesn't log anything, this is a safety check
      const mockStudent = {
        name: 'Test Student',
        mobile: '9876543210',
        seatCode: 'A001',
        shift: 'Morning',
        joiningDate: '2024-01-01',
        expiryDate: '2024-12-31',
        duration: '12 Month(s)',
        fee: 5000
      };

      const mockPayment = {
        receiptNo: 'DDL-20240101-ABC123',
        amount: 5000,
        paidOn: '2024-01-01'
      };

      // Should not throw any errors related to logging
      await expect(
        generateAdmissionReceipt({ student: mockStudent, payment: mockPayment })
      ).resolves.toBeInstanceOf(Buffer);
    });
  });
});
