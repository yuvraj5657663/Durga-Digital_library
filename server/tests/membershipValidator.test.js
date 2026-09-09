import { renewMembershipSchema } from '../src/validators/membershipValidator.js';

describe('Renewal validation contract', () => {
  const basePayload = {
    studentId: 'student123',
    duration: '1 Month(s)',
    fee: 500
  };

  it.each(['cash', 'upi', 'bank_transfer', 'cheque', 'other'])('accepts %s payment mode', (paymentMode) => {
    const { error, value } = renewMembershipSchema.validate({ ...basePayload, paymentMode });

    expect(error).toBeUndefined();
    expect(value.paymentMode).toBe(paymentMode);
  });

  it('rejects the old title-case frontend value', () => {
    const { error } = renewMembershipSchema.validate({ ...basePayload, paymentMode: 'Cash' });

    expect(error).toBeDefined();
    expect(error.details[0].path).toEqual(['paymentMode']);
  });
});