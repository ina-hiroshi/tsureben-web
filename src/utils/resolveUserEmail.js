import { normalizeEmail } from './normalizeEmail';

/** Firebase Auth ユーザーから Firestore 用メールアドレスを解決する */
export function resolveUserEmail(user) {
  if (!user) return null;

  const candidates = [user.email, ...(user.providerData || []).map((p) => p.email)];
  for (const candidate of candidates) {
    const normalized = normalizeEmail(candidate);
    if (normalized) return normalized;
  }

  try {
    return normalizeEmail(localStorage.getItem('email'));
  } catch {
    return null;
  }
}

export function isAppleAuthUser(user) {
  return !!user?.providerData?.some((p) => p.providerId === 'apple.com');
}
