import {
  permissionsForRole,
  roleHasPermission,
  roleIsStaff
} from '../src/config/accessControl.js';

describe('access control policy', () => {
  it('preserves legacy admin as full-privilege staff', () => {
    expect(roleIsStaff('admin')).toBe(true);
    expect(roleHasPermission('admin', 'SETTINGS_MANAGE')).toBe(true);
  });

  it('grants super admin every permission', () => {
    expect(roleHasPermission('SUPER_ADMIN', 'ADMIN_MANAGE')).toBe(true);
    expect(roleHasPermission('SUPER_ADMIN', 'WIFI_MANAGE')).toBe(true);
  });

  it('keeps accountant payment-focused', () => {
    expect(roleHasPermission('ACCOUNTANT', 'PAYMENT_CREATE')).toBe(true);
    expect(roleHasPermission('ACCOUNTANT', 'PAYMENT_REFUND')).toBe(true);
    expect(roleHasPermission('ACCOUNTANT', 'WIFI_MANAGE')).toBe(false);
    expect(roleHasPermission('ACCOUNTANT', 'ADMIN_MANAGE')).toBe(false);
  });

  it('allows explicit permissions to extend a role', () => {
    expect(roleHasPermission('SUPPORT', 'NOTIFICATION_SEND', ['NOTIFICATION_SEND'])).toBe(true);
  });

  it('returns no staff permissions for student accounts', () => {
    expect(permissionsForRole('student')).toEqual([]);
    expect(roleIsStaff('student')).toBe(false);
  });
});
