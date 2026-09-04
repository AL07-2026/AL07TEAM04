export type AdminRole = 'super_admin' | 'operations_admin' | 'finance_admin' | 'viewer';

import { auth } from '@/lib/firebase';

export const DEFAULT_SUPER_ADMIN_EMAIL = 'dbswndtla77777@gmail.com';

const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: '최고 관리자',
  operations_admin: '운영 관리자',
  finance_admin: '정산 관리자',
  viewer: '조회 관리자',
};

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

export function getConfiguredSuperAdminEmails() {
  const env = import.meta.env as Record<string, string | undefined>;
  return [
    env.VITE_SUPER_ADMIN_EMAIL,
    ...(env.VITE_SUPER_ADMIN_EMAILS?.split(',') ?? []),
    DEFAULT_SUPER_ADMIN_EMAIL,
  ]
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isSuperAdminEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail ? getConfiguredSuperAdminEmails().includes(normalizedEmail) : false;
}

export function getAdminRoleForEmail(email?: string | null): AdminRole | null {
  return isSuperAdminEmail(email) ? 'super_admin' : null;
}

type AdminAccessResponse = {
  admin?: { granted?: boolean; role?: AdminRole };
  error?: string;
  ok?: boolean;
};

export async function requestAdminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('로그인이 필요합니다.');
  const token = await currentUser.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || '관리자 요청을 처리하지 못했습니다.');
  }
  return payload;
}

export async function resolveCurrentAdminRole(): Promise<AdminRole | null> {
  const currentUser = auth.currentUser;
  const fallbackRole = getAdminRoleForEmail(currentUser?.email);
  if (!currentUser) return fallbackRole;

  try {
    const result = await requestAdminApi<AdminAccessResponse>('/api/admin/access');
    const role = result.admin?.role;
    if (result.admin?.granted) await currentUser.getIdToken(true);
    return role && Object.hasOwn(ADMIN_ROLE_LABELS, role) ? role : fallbackRole;
  } catch (error) {
    if (fallbackRole) return fallbackRole;
    const statusMessage = error instanceof Error ? error.message : '';
    if (statusMessage === '관리자 권한이 없습니다.') return null;
    console.warn('Admin access check failed:', error);
    return null;
  }
}

export function getAdminRoleLabel(role?: AdminRole | null) {
  return role ? ADMIN_ROLE_LABELS[role] : '관리자 아님';
}

export function canManageAdminSettings(role?: AdminRole | null) {
  return role === 'super_admin';
}

export function canManageOperations(role?: AdminRole | null) {
  return role === 'super_admin' || role === 'operations_admin';
}

export function canManageFinance(role?: AdminRole | null) {
  return role === 'super_admin' || role === 'finance_admin';
}

export function canViewPrivateContact(role?: AdminRole | null) {
  return role === 'super_admin' || role === 'operations_admin' || role === 'finance_admin';
}
