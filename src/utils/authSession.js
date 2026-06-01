import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import * as presenceService from '../services/firestore/presenceService';
import * as studyTimerStorage from './studyTimerStorage';

const SESSION_KEYS = [
  'email',
  'userName',
  'googleId',
  'oauthReturnUrl',
  'pomodoro-start-date',
  'pomodoro-timer-state',
  'userEmail',
  studyTimerStorage.STORAGE_KEY,
  'tsureben_timer_start',
];

async function cleanupActiveTimerSession() {
  const active = studyTimerStorage.loadAnyActive();
  if (!active?.email) return;
  try {
    await presenceService.endSession(active.email);
  } catch (err) {
    console.error('logout endSession error:', err);
  }
}

export async function logout() {
  try {
    await cleanupActiveTimerSession();
    await signOut(auth);
  } finally {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  }
}
