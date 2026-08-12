import AdmissionInquiry from '../models/AdmissionInquiry.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import { ValidationError } from '../utils/errors.js';

function normalizeMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function isValidMobile(mobile) {
  const digits = normalizeMobile(mobile);
  return digits.length >= 10 && digits.length <= 15;
}

export const createAdmissionInquiryController = asyncHandler(async (req, res) => {
  const { name, phone, whatsapp, address, shift, joiningDate } = req.body;

  if (!name) {
    throw new ValidationError('Student Full Name is required');
  }
  if (!phone) {
    throw new ValidationError('Mobile Number is required');
  }
  if (!isValidMobile(phone)) {
    throw new ValidationError('Mobile number is invalid');
  }
  if (!whatsapp) {
    throw new ValidationError('WhatsApp Number is required');
  }
  if (!isValidMobile(whatsapp)) {
    throw new ValidationError('WhatsApp number is invalid');
  }
  if (!address) {
    throw new ValidationError('Address/Village is required');
  }
  if (!shift) {
    throw new ValidationError('Preferred Shift is required');
  }
  if (!['Morning', 'Afternoon', 'Evening', 'Full Day'].includes(shift)) {
    throw new ValidationError('Invalid shift option');
  }
  if (!joiningDate) {
    throw new ValidationError('Joining Date is required');
  }

  const inquiry = await AdmissionInquiry.create({
    name,
    phone: normalizeMobile(phone),
    whatsapp: normalizeMobile(whatsapp),
    address,
    shift,
    joiningDate: new Date(joiningDate),
    status: 'Pending'
  });

  // Log WhatsApp notifications (async, don't block)
  const studentMessage = `Hi ${name}, thank you for applying to Durga Digital Library. Saurav Kumar (+91 7542893960) will verify your request shortly.`;
  console.log(`[WhatsApp - Student] To: ${whatsapp}, Message: ${studentMessage}`);

  const adminMessage = `Alert: New Online Admission Inquiry received from ${name} - ${phone} for ${shift} shift.`;
  console.log(`[WhatsApp - Admin] To: 917542893960, Message: ${adminMessage}`);

  return successResponse(res, inquiry, 'Application submitted successfully! We will contact you soon.', 201);
});

export const listAdmissionInquiriesController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;
  
  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [inquiries, total] = await Promise.all([
    AdmissionInquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    AdmissionInquiry.countDocuments(filter)
  ]);

  return paginatedResponse(res, inquiries, { page: parseInt(page), limit: parseInt(limit), total }, 'Admission inquiries retrieved');
});

export const updateAdmissionInquiryController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new ValidationError('Status is required');
  }
  if (!['Pending', 'Approved', 'Rejected', 'Seat Assigned'].includes(status)) {
    throw new ValidationError('Invalid status option');
  }

  const inquiry = await AdmissionInquiry.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!inquiry) {
    throw new ValidationError('Admission inquiry not found');
  }

  return successResponse(res, inquiry, 'Admission inquiry status updated successfully');
});

export const deleteAdmissionInquiryController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const inquiry = await AdmissionInquiry.findByIdAndDelete(id);

  if (!inquiry) {
    throw new ValidationError('Admission inquiry not found');
  }

  return successResponse(res, null, 'Admission inquiry deleted successfully');
});

export const getPendingCountController = asyncHandler(async (req, res) => {
  const count = await AdmissionInquiry.countDocuments({ status: 'Pending' });
  return successResponse(res, { count }, 'Pending inquiries count retrieved');
});