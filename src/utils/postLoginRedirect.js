import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const POST_LOGIN_RETURN_URL_KEY = 'postLoginReturnUrl';

export function setPostLoginReturnUrl(url) {
  if (url) {
    sessionStorage.setItem(POST_LOGIN_RETURN_URL_KEY, url);
  }
}

export function consumePostLoginReturnUrl(fallback = '/home') {
  const url = sessionStorage.getItem(POST_LOGIN_RETURN_URL_KEY) || fallback;
  sessionStorage.removeItem(POST_LOGIN_RETURN_URL_KEY);
  return url;
}

export function peekPostLoginReturnUrl() {
  return sessionStorage.getItem(POST_LOGIN_RETURN_URL_KEY);
}

export async function resolveDefaultPostLoginPath(email) {
  if (!email) return '/home';
  try {
    const snap = await getDoc(doc(db, 'teachers', email));
    return snap.exists() ? '/teacher' : '/home';
  } catch (err) {
    console.error('Failed to resolve post-login path:', err);
    return '/home';
  }
}
