'use client';

import { useAuth } from './auth-provider';

/**
 * Hook to check if current logged-in user has a specific permission
 */
export function usePermission(requiredPermission) {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (!user.permissions || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(requiredPermission);
}

/**
 * Hook to check if current logged-in user has a specific role
 */
export function useRole(requiredRole) {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.role === requiredRole;
}

/**
 * Render children only if user possesses the required permission
 */
export function PermissionGate({ permission, children, fallback = null }) {
  const hasPerm = usePermission(permission);
  if (!hasPerm) return fallback;
  return <>{children}</>;
}

/**
 * Render children only if user possesses the required role
 */
export function RoleGate({ role, children, fallback = null }) {
  const hasRole = useRole(role);
  if (!hasRole) return fallback;
  return <>{children}</>;
}
