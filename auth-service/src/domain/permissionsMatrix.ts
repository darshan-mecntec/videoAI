import { UserRole, Permission } from './types';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'platform:admin',
    'providers:write',
    'providers:read',
    'credits:manage',
    'credits:view',
    'users:write',
    'users:read',
    'video:generate',
    'image:generate',
    'audio:generate',
    'assets:read',
    'assets:delete',
    'billing:view',
    'apikeys:manage',
    'pool:manage',
    'audit:read',
  ],
  member: [
    'credits:view',
    'video:generate',
    'image:generate',
    'audio:generate',
    'assets:read',
  ],
};

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member;
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}
