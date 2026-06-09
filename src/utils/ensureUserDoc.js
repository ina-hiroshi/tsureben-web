import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeNameLower } from './mateScope';
import { resolveUserEmail } from './resolveUserEmail';

export async function ensureUserDoc(user, extra = {}) {
  const email = resolveUserEmail(user);
  if (!email) return;
  const userRef = doc(db, 'users', email);
  const userDoc = await getDoc(userRef);
  const name = user.displayName ?? email.split('@')[0];
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
