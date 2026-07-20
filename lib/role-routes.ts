import type { Role } from '@/lib/types';

export const landingPathForRole: Record<Role, string> = {
  requester: '/bookings/new',
  approver: '/approvals',
  admin: '/admin/bookings',
  driver: '/driver/trips',
};
