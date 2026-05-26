import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function ensureUserDoc(user, extra = {}) {
  if (!user?.email) return;
  const userRef = doc(db, 'users', user.email);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      name: user.displayName ?? '',
      createdAt: serverTimestamp(),
      role: 'student',
      profileComplete: false,
      ...extra,
    });
  }
}
