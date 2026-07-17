import { Capacitor } from '@capacitor/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const isNativeApp = () => Capacitor.isNativePlatform();

export const isWebPlatform = () => !Capacitor.isNativePlatform();

export const isIOSNative = () => {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  // iPad でも通常は 'ios'。将来の 'ipados' にも備える。
  return platform === 'ios' || platform === 'ipados';
};

export const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const isNativeMobile = () => isIOSNative() || isAndroidNative();

export async function isTeacherEmail(email) {
  if (!email) return false;
  try {
    const snap = await getDoc(doc(db, 'teachers', email.trim().toLowerCase()));
    return snap.exists();
  } catch (err) {
    console.error('Failed to check teacher status:', err);
    return false;
  }
}

export async function getUserRegistrationType(email) {
  if (!email) return null;
  try {
    const snap = await getDoc(doc(db, 'users', email.trim().toLowerCase()));
    if (!snap.exists()) return null;
    return snap.data()?.registrationType ?? null;
  } catch (err) {
    console.error('Failed to get registration type:', err);
    return null;
  }
}

export function canUseWebAsStudent(registrationType) {
  return registrationType === 'school_provisioned';
}
