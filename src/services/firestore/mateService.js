import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getProfile } from './userService';
import { acceptMateRequest, cancelMateRequest, redeemMateInvite } from '../authApi';
import { mergeDemoMateState } from '../../dev/demoMate';

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

export async function acceptRequest(myEmail, fromEmail) {
  await acceptMateRequest({ fromEmail });
}

export async function cancelRequest(myEmail, toEmail) {
  await cancelMateRequest({ toEmail });
}

export async function submitMateInviteRequest(token) {
  return redeemMateInvite({ token });
}

export async function hideUser(myEmail, targetEmail, isMutual) {
  const field = isMutual ? 'hiddenMates' : 'hiddenRequests';
  await updateDoc(doc(db, 'users', myEmail), { [field]: arrayUnion(targetEmail) });
}

export async function unhideUser(myEmail, targetEmail, isMutual) {
  const field = isMutual ? 'hiddenMates' : 'hiddenRequests';
  await updateDoc(doc(db, 'users', myEmail), { [field]: arrayRemove(targetEmail) });
}

async function attachSchoolNames(profiles) {
  const schoolIds = [
    ...new Set(Object.values(profiles).map((p) => p.schoolId).filter(Boolean)),
  ];
  const namesById = {};
  await Promise.all(
    schoolIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'schools', id));
      namesById[id] = snap.exists() ? snap.data().name || '' : '';
    })
  );

  const enriched = {};
  for (const [email, profile] of Object.entries(profiles)) {
    enriched[email] = {
      ...profile,
      schoolName:
        profile.schoolName ||
        (profile.schoolId ? namesById[profile.schoolId] : '') ||
        '',
    };
  }
  return enriched;
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

  const profilesWithSchools = await attachSchoolNames(profiles);
  const merged = { ...state, profiles: profilesWithSchools };
  return mergeDemoMateState(merged, email);
}
