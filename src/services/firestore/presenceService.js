import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { mergeDemoPresenceUsers } from '../../dev/demoPresence';

export async function startSession(email, profile, extra = {}) {
  const mateEmails = profile.mutualMates || [];
  await setDoc(doc(db, 'activeSessions', email), {
    name: profile.name || email.split('@')[0],
    schoolId: profile.schoolId ?? null,
    grade: profile.grade || '',
    class: profile.class || '',
    number: profile.number || '',
    shareScope: profile.shareScope || '学年のみ',
    subject: extra.subject || '勉強中',
    topic: extra.topic || '',
    book: extra.book || '',
    content: extra.content || '',
    startTime: extra.startTime,
    isPaused: extra.isPaused === true,
    pausedElapsedMinutes: null,
    mateEmails,
  });
}

export async function pauseSession(email, elapsedMinutes) {
  await setDoc(
    doc(db, 'activeSessions', email),
    {
      isPaused: true,
      pausedElapsedMinutes: Math.max(0, elapsedMinutes),
    },
    { merge: true }
  );
}

export async function resumeSession(email) {
  await setDoc(
    doc(db, 'activeSessions', email),
    {
      isPaused: false,
      pausedElapsedMinutes: null,
    },
    { merge: true }
  );
}

export async function endSession(email) {
  await deleteDoc(doc(db, 'activeSessions', email));
}

export function subscribeMateSessions(myEmail, { mutualMates = [], hiddenMates = [] }, callback) {
  const q = query(
    collection(db, 'activeSessions'),
    where('mateEmails', 'array-contains', myEmail)
  );

  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs
        .map((d) => ({ email: d.id, ...d.data() }))
        .filter(
          (u) =>
            u.email !== myEmail &&
            mutualMates.includes(u.email) &&
            !hiddenMates.includes(u.email)
        );
      callback(mergeDemoPresenceUsers(users, myEmail));
    },
    (err) => {
      console.error('subscribeMateSessions error:', err);
      callback(mergeDemoPresenceUsers([], myEmail));
    }
  );
}

export function subscribeSchoolActiveSessions(schoolId, callback) {
  if (!schoolId) {
    callback([]);
    return () => {};
  }

  const q = query(collection(db, 'activeSessions'), where('schoolId', '==', schoolId));

  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs.map((d) => ({ email: d.id, ...d.data() }));
      callback(mergeDemoPresenceUsers(users, null));
    },
    (err) => {
      console.error('subscribeSchoolActiveSessions error:', err);
      callback(mergeDemoPresenceUsers([], null));
    }
  );
}

export function subscribeVisibleSessions(profile, isTeacher, teacherSchoolId, callback) {
  const myEmail = profile.email;
  const shareScope = profile.shareScope || '学年のみ';

  let q;
  if (isTeacher && teacherSchoolId) {
    q = query(collection(db, 'activeSessions'), where('schoolId', '==', teacherSchoolId));
  } else if (shareScope === '連れ勉仲間のみ') {
    q = query(
      collection(db, 'activeSessions'),
      where('mateEmails', 'array-contains', myEmail)
    );
  } else if (shareScope === '組のみ' && profile.schoolId) {
    q = query(
      collection(db, 'activeSessions'),
      where('schoolId', '==', profile.schoolId),
      where('grade', '==', profile.grade),
      where('class', '==', profile.class)
    );
  } else if (profile.schoolId) {
    q = query(
      collection(db, 'activeSessions'),
      where('schoolId', '==', profile.schoolId),
      where('grade', '==', profile.grade)
    );
  } else {
    q = query(
      collection(db, 'activeSessions'),
      where('mateEmails', 'array-contains', myEmail)
    );
  }

  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs
        .map((d) => ({ email: d.id, ...d.data() }))
        .filter((u) => u.email !== myEmail);
      callback(mergeDemoPresenceUsers(users, myEmail));
    },
    (err) => {
      console.error('subscribeVisibleSessions error:', err);
      callback(mergeDemoPresenceUsers([], myEmail));
    }
  );
}

export async function updateSessionContent(email, fields) {
  await setDoc(doc(db, 'activeSessions', email), fields, { merge: true });
}
