import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeNameLower } from './mateScope';

export async function ensureUserDoc(user, extra = {}) {
  if (!user?.email) return;
  const userRef = doc(db, 'users', user.email);
  const userDoc = await getDoc(userRef);
  const name = user.displayName ?? user.email.split('@')[0];
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      name,
      nameLower: normalizeNameLower(name),
      createdAt: serverTimestamp(),
      role: 'student',
      profileComplete: false,
      shareScope: '学年のみ',
      mateScope: '学内のみ',
      mutualMates: [],
      pendingSent: [],
      pendingReceived: [],
      hiddenMates: [],
      hiddenRequests: [],
      subjectCatalog: {},
      ...extra,
    });
  }
}
