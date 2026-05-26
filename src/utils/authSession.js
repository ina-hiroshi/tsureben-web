import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const SESSION_KEYS = [
  'email',
  'userName',
  'googleId',
  'oauthReturnUrl',
  'pomodoro-start-date',
  'pomodoro-timer-state',
  'userEmail',
];

export async function logout() {
  try {
    await signOut(auth);
  } finally {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  }
}
