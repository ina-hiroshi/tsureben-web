import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { OAuthProvider, reauthenticateWithCredential, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';

const APP_BUNDLE_ID = 'com.tsureben.app';

function generateNonce(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const values = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i += 1) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isAppleLoginCancelled(err) {
  if (!err) return false;
  const code = String(err?.code || '');
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return true;
  }
  const message = String(err?.message || err?.errorMessage || '').toLowerCase();
  return (
    message.includes('cancel') ||
    message.includes('キャンセル') ||
    message.includes('1001')
  );
}

export async function signInWithApple() {
  const rawNonce = generateNonce();
  const hashedNonce = await sha256(rawNonce);

  const result = await SignInWithApple.authorize({
    clientId: APP_BUNDLE_ID,
    redirectURI: '',
    scopes: 'email name',
    state: generateNonce(16),
    nonce: hashedNonce,
  });

  const identityToken = result?.response?.identityToken;
  if (!identityToken) {
    throw new Error('Apple ID トークンの取得に失敗しました');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });
  return signInWithCredential(auth, credential);
}

export async function reauthenticateWithApple(user) {
  const rawNonce = generateNonce();
  const hashedNonce = await sha256(rawNonce);

  const result = await SignInWithApple.authorize({
    clientId: APP_BUNDLE_ID,
    redirectURI: '',
    scopes: 'email name',
    state: generateNonce(16),
    nonce: hashedNonce,
  });

  const identityToken = result?.response?.identityToken;
  if (!identityToken) {
    throw new Error('Apple ID トークンの取得に失敗しました');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });
  return reauthenticateWithCredential(user, credential);
}
