// Mock AttendanceRepository for Jest tests
const mockAttendanceRepository = {
  findByStudentAndDate: jest.fn(),
  createAttendance: jest.fn(),
  findOneAndUpdateAttendance: jest.fn(),
  findById: jest.fn(),
  findByStudentId: jest.fn(),
  findByDateRange: jest.fn(),
  findByShift: jest.fn(),
  findByBranch: jest.fn(),
  updateCheckOut: jest.fn(),
  findTodayAttendance: jest.fn()
};

export default mockAttendanceRepository;
