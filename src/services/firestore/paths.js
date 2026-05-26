export const COLLECTIONS = {
  users: 'users',
  teachers: 'teachers',
  schools: 'schools',
  activeSessions: 'activeSessions',
};

export function userDoc(email) {
  return ['users', email];
}

export function planDayDoc(email, dateKey) {
  return ['plans', email, 'days', dateKey];
}

export function logDayDoc(email, dateKey) {
  return ['logs', email, 'days', dateKey];
}

export function activeSessionDoc(email) {
  return ['activeSessions', email];
}

export function teacherDoc(email) {
  return ['teachers', email];
}
