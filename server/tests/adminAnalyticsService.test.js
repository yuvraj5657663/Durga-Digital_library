jest.mock('../src/models/Student.js', () => ({ find: jest.fn() }));
jest.mock('../src/models/Attendance.js', () => ({ find: jest.fn() }));
jest.mock('../src/models/Payment.js', () => ({ find: jest.fn() }));

import Student from '../src/models/Student.js';
import Attendance from '../src/models/Attendance.js';
import Payment from '../src/models/Payment.js';
import { answerAnalyticsQuestion, parseAnalyticsIntent } from '../src/services/adminAnalyticsService.js';

describe('admin analytics fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses supported intents without an AI provider', () => {
    expect(parseAnalyticsIntent('Who expires in 7 days?')).toEqual({ type: 'expiring', days: 7 });
    expect(parseAnalyticsIntent("Who's been absent 3+ days?")).toEqual({ type: 'absent', days: 3 });
    expect(parseAnalyticsIntent("today's cash collection")).toEqual({ type: 'cash_today' });
  });

  it('returns local expiry data only', async () => {
    Student.find.mockReturnValue({ select: () => ({ sort: () => ({ lean: jest.fn().mockResolvedValue([{ name: 'A', studentId: 'S1', expiryDate: '2099-01-01', status: 'Active' }]) }) }) });

    const result = await answerAnalyticsQuestion('who expires in 7 days?');

    expect(result.provider).toBe('deterministic-analytics');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].name).toBe('A');
  });

  it('calculates today cash collection from paid cash records', async () => {
    Payment.find.mockReturnValue({
      populate: () => ({
        select: () => ({
          lean: jest.fn().mockResolvedValue([
            { amount: 500, type: 'admission', student: { name: 'A' } },
            { amount: 300, type: 'renewal', student: { name: 'B' } }
          ])
        })
      })
    });

    const result = await answerAnalyticsQuestion("today's cash collection");

    expect(result.total).toBe(800);
    expect(result.results).toHaveLength(2);
  });

  it('does not query data for unsupported questions', async () => {
    const result = await answerAnalyticsQuestion('tell me a joke');

    expect(result.results).toEqual([]);
    expect(Student.find).not.toHaveBeenCalled();
    expect(Attendance.find).not.toHaveBeenCalled();
    expect(Payment.find).not.toHaveBeenCalled();
  });
});
