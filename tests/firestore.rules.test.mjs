import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(join(__dirname, '../firestore.rules'), 'utf8');
const PROJECT_ID = 'tsureben-rules-test';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

async function seedBaseData() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('schools/school-a').set({ name: 'A高校' });
    await db.doc('users/student-a@school.test').set({
      schoolId: 'school-a',
      role: 'student',
      name: '生徒A',
      grade: '1',
      class: '1',
      number: '1',
      registrationType: 'school_provisioned',
      mutualMates: [],
      pendingSent: [],
      pendingReceived: [],
    });
    await db.doc('users/student-b@school.test').set({
      schoolId: 'school-a',
      role: 'student',
      name: '生徒B',
      grade: '1',
      class: '1',
      number: '2',
      registrationType: 'school_provisioned',
      mutualMates: [],
      pendingSent: [],
      pendingReceived: [],
    });
    await db.doc('teachers/teacher-a@school.test').set({
      schoolId: 'school-a',
      role: 'teacher',
      name: '教員A',
    });
  });
}

describe('users collection', () => {
  it('blocks student from reading unrelated student profile', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc('users/student-b@school.test').get()
    );
  });

  it('allows student to read own profile', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertSucceeds(
      studentA.firestore().doc('users/student-a@school.test').get()
    );
  });

  it('blocks student from escalating schoolId on update', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc('users/student-a@school.test').update({
        schoolId: 'school-other',
      })
    );
  });

  it('blocks student from writing mutualMates directly', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc('users/student-a@school.test').update({
        mutualMates: ['student-b@school.test'],
        updatedAt: new Date(),
      })
    );
  });

  it('allows teacher to read same-school student', async () => {
    await seedBaseData();
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertSucceeds(
      teacher.firestore().doc('users/student-a@school.test').get()
    );
  });
});

describe('schools collection', () => {
  it('blocks client writes including super_admin', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('teachers/super@school.test').set({
        schoolId: 'school-a',
        role: 'super_admin',
        name: 'Super',
      });
    });
    const superAdmin = testEnv.authenticatedContext('super@school.test', {
      email: 'super@school.test',
    });
    await assertFails(
      superAdmin.firestore().collection('schools').add({ name: '新規校' })
    );
    await assertFails(
      superAdmin.firestore().doc('schools/school-a').update({ name: '改ざん' })
    );
  });

  it('allows authenticated read of schools', async () => {
    await seedBaseData();
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertSucceeds(teacher.firestore().doc('schools/school-a').get());
  });
});

describe('accountTransfers collection', () => {
  it('blocks all client read and write', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc('accountTransfers/123456').get()
    );
    await assertFails(
      studentA.firestore().doc('accountTransfers/123456').set({
        sourceEmail: 'student-a@school.test',
        used: false,
      })
    );
  });
});

describe('schoolJoinInvites collection', () => {
  it('blocks all client read and write', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc('schoolJoinInvites/student-a@school.test').get()
    );
    await assertFails(
      studentA.firestore().doc('schoolJoinInvites/student-a@school.test').set({
        schoolId: 'school-a',
      })
    );
  });
});

describe('activeSessions collection', () => {
  it('blocks unrelated student from reading another session', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('activeSessions/student-b@school.test').set({
        schoolId: 'school-a',
        grade: '2',
        class: '1',
        mateEmails: [],
        shareScope: '学年のみ',
      });
    });
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc('activeSessions/student-b@school.test').get()
    );
  });
});
