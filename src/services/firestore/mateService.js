import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getProfile } from './userService';
import { canMateInteract } from '../../utils/mateScope';

export async function getMateState(email) {
  const profile = await getProfile(email);
  if (!profile) {
    return {
      mutualMates: [],
      pendingSent: [],
      pendingReceived: [],
      hiddenMates: [],
      hiddenRequests: [],
    };
  }
  return {
    mutualMates: profile.mutualMates || [],
    pendingSent: profile.pendingSent || [],
    pendingReceived: profile.pendingReceived || [],
    hiddenRequests: profile.hiddenRequests || [],
    hiddenMates: profile.hiddenMates || [],
    profile,
  };
}

export async function sendRequest(fromEmail, toEmail) {
  const [me, target] = await Promise.all([getProfile(fromEmail), getProfile(toEmail)]);
  if (!me || !target) throw new Error('ユーザーが見つかりません');
  if (!canMateInteract(me, target)) throw new Error('申請できないユーザーです');
  if ((me.mutualMates || []).includes(toEmail)) throw new Error('既に連れ勉仲間です');

  await updateDoc(doc(db, 'users', fromEmail), { pendingSent: arrayUnion(toEmail) });
  await updateDoc(doc(db, 'users', toEmail), { pendingReceived: arrayUnion(fromEmail) });
}

import { acceptMateRequest } from '../authApi';

export async function acceptRequest(myEmail, fromEmail) {
  await acceptMateRequest({ fromEmail });
}

export async function cancelRequest(myEmail, toEmail) {
  await updateDoc(doc(db, 'users', myEmail), { pendingSent: arrayRemove(toEmail) });
  await updateDoc(doc(db, 'users', toEmail), { pendingReceived: arrayRemove(myEmail) });
}

export async function hideUser(myEmail, targetEmail, isMutual) {
  const field = isMutual ? 'hiddenMates' : 'hiddenRequests';
  await updateDoc(doc(db, 'users', myEmail), { [field]: arrayUnion(targetEmail) });
}

export async function unhideUser(myEmail, targetEmail, isMutual) {
  const field = isMutual ? 'hiddenMates' : 'hiddenRequests';
  await updateDoc(doc(db, 'users', myEmail), { [field]: arrayRemove(targetEmail) });
}

export async function loadMateProfiles(email) {
  const state = await getMateState(email);
  const allEmails = new Set([
    ...state.mutualMates,
    ...state.pendingSent,
    ...state.pendingReceived,
    ...(state.hiddenMates || []),
    ...(state.hiddenRequests || []),
  ]);

  const profiles = {};
  await Promise.all(
    [...allEmails].map(async (e) => {
      const p = await getProfile(e);
      if (p) profiles[e] = p;
    })
  );

  return { ...state, profiles };
}
