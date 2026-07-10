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
    await db.doc('schools/school-b').set({ name: 'B高校' });
    await db.doc('users/student-a@school.test').set({
      schoolId: 'school-a',
      role: 'student',
      name: '生徒A',
      grade: '1',
      class: '1',
      number: '1',
      registrationType: 'school_provisioned',
      mateScope: '学内のみ',
      shareScope: '学年のみ',
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
      mateScope: '学内のみ',
      shareScope: '学年のみ',
      mutualMates: [],
      pendingSent: [],
      pendingReceived: [],
    });
    await db.doc('users/student-c@school.test').set({
      schoolId: 'school-b',
      role: 'student',
      name: '生徒C',
      grade: '1',
      class: '1',
      number: '1',
      registrationType: 'school_provisioned',
      mateScope: '学内のみ',
      shareScope: '学年のみ',
      mutualMates: [],
      pendingSent: [],
      pendingReceived: [],
    });
    await db.doc('teachers/teacher-a@school.test').set({
      schoolId: 'school-a',
      role: 'teacher',
      name: '教員A',
    });
    await db.doc('teachers/teacher-b@school.test').set({
      schoolId: 'school-b',
      role: 'teacher',
      name: '教員B',
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

  it('allows teacher to list same-school students', async () => {
    await seedBaseData();
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    const snap = await assertSucceeds(
      teacher
        .firestore()
        .collection('users')
        .where('schoolId', '==', 'school-a')
        .where('role', '==', 'student')
        .get()
    );
    assert.equal(snap.size, 2);
  });

  it('allows school_admin to list same-school students', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('teachers/admin-a@school.test').set({
        schoolId: 'school-a',
        role: 'school_admin',
        name: 'AdminA',
      });
    });
    const admin = testEnv.authenticatedContext('admin-a@school.test', {
      email: 'admin-a@school.test',
    });
    const snap = await assertSucceeds(
      admin
        .firestore()
        .collection('users')
        .where('schoolId', '==', 'school-a')
        .where('role', '==', 'student')
        .get()
    );
    assert.equal(snap.size, 2);
  });

  it('blocks teacher from listing other-school students', async () => {
    await seedBaseData();
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertFails(
      teacher
        .firestore()
        .collection('users')
        .where('schoolId', '==', 'school-other')
        .where('role', '==', 'student')
        .get()
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

  it('allows teacher to read same-school student session', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('activeSessions/student-a@school.test').set({
        schoolId: 'school-a',
        grade: '1',
        class: '1',
        mateEmails: [],
        shareScope: '学年のみ',
        subject: '数学',
      });
    });
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertSucceeds(
      teacher.firestore().doc('activeSessions/student-a@school.test').get()
    );
  });
});

describe('logs collection', () => {
  it('allows student to write own day log', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertSucceeds(
      studentA
        .firestore()
        .doc('logs/student-a@school.test/days/2026-07-10')
        .set({
          entries: [{ id: '1', startTime: '10:00', subject: '数学', duration: 30 }],
          totalMinutes: 30,
          bySubject: { 数学: 30 },
        })
    );
  });

  it('allows teacher to read same-school student logs', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc('logs/student-a@school.test/days/2026-07-10')
        .set({ entries: [], totalMinutes: 0, bySubject: {} });
    });
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertSucceeds(
      teacher.firestore().doc('logs/student-a@school.test/days/2026-07-10').get()
    );
  });

  it('blocks teacher from reading other-school student logs', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc('logs/student-c@school.test/days/2026-07-10')
        .set({ entries: [], totalMinutes: 0, bySubject: {} });
    });
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertFails(
      teacher.firestore().doc('logs/student-c@school.test/days/2026-07-10').get()
    );
  });

  it('blocks student from reading another student logs', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc('logs/student-b@school.test/days/2026-07-10')
        .set({ entries: [], totalMinutes: 0, bySubject: {} });
    });
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc('logs/student-b@school.test/days/2026-07-10').get()
    );
  });
});

describe('plans collection', () => {
  it('allows student to write own day plan', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertSucceeds(
      studentA
        .firestore()
        .doc('plans/student-a@school.test/days/2026-07-10')
        .set({
          entries: [{ id: '1', start: '10:00', end: '11:00', subject: '英語' }],
        })
    );
  });

  it('allows teacher to read same-school student plans', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc('plans/student-a@school.test/days/2026-07-10')
        .set({ entries: [] });
    });
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertSucceeds(
      teacher.firestore().doc('plans/student-a@school.test/days/2026-07-10').get()
    );
  });

  it('blocks teacher from reading other-school student plans', async () => {
    await seedBaseData();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc('plans/student-c@school.test/days/2026-07-10')
        .set({ entries: [] });
    });
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertFails(
      teacher.firestore().doc('plans/student-c@school.test/days/2026-07-10').get()
    );
  });
});

describe('mateInvites collection', () => {
  it('blocks all client read and write', async () => {
    await seedBaseData();
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(studentA.firestore().doc('mateInvites/test-token').get());
    await assertFails(
      studentA.firestore().doc('mateInvites/test-token').set({
        inviterEmail: 'student-a@school.test',
      })
    );
  });
});

describe('feedbackThreads collection', () => {
  it('allows teacher to create thread for same-school student', async () => {
    await seedBaseData();
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertSucceeds(
      teacher.firestore().collection('feedbackThreads').add({
        studentEmail: 'student-a@school.test',
        schoolId: 'school-a',
        scope: 'daily',
        dateKey: '2026-07-10',
        title: '7/10 フィードバック',
        createdBy: 'teacher-a@school.test',
        createdByName: '教員A',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        unreadByStudent: true,
        unreadByTeacher: false,
      })
    );
  });

  it('allows student to read own feedback thread', async () => {
    await seedBaseData();
    let threadId;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await ctx.firestore().collection('feedbackThreads').add({
        studentEmail: 'student-a@school.test',
        schoolId: 'school-a',
        scope: 'daily',
        dateKey: '2026-07-10',
        title: '7/10',
        createdBy: 'teacher-a@school.test',
        createdByName: '教員A',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        unreadByStudent: true,
        unreadByTeacher: false,
      });
      threadId = ref.id;
    });
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertSucceeds(
      studentA.firestore().doc(`feedbackThreads/${threadId}`).get()
    );
  });

  it('blocks teacher from reading other-school student thread', async () => {
    await seedBaseData();
    let threadId;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await ctx.firestore().collection('feedbackThreads').add({
        studentEmail: 'student-c@school.test',
        schoolId: 'school-b',
        scope: 'daily',
        dateKey: '2026-07-10',
        title: '7/10',
        createdBy: 'teacher-b@school.test',
        createdByName: '教員B',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        unreadByStudent: true,
        unreadByTeacher: false,
      });
      threadId = ref.id;
    });
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertFails(
      teacher.firestore().doc(`feedbackThreads/${threadId}`).get()
    );
  });

  it('blocks student from reading another student thread', async () => {
    await seedBaseData();
    let threadId;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await ctx.firestore().collection('feedbackThreads').add({
        studentEmail: 'student-b@school.test',
        schoolId: 'school-a',
        scope: 'daily',
        dateKey: '2026-07-10',
        title: '7/10',
        createdBy: 'teacher-a@school.test',
        createdByName: '教員A',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        unreadByStudent: true,
        unreadByTeacher: false,
      });
      threadId = ref.id;
    });
    const studentA = testEnv.authenticatedContext('student-a@school.test', {
      email: 'student-a@school.test',
    });
    await assertFails(
      studentA.firestore().doc(`feedbackThreads/${threadId}`).get()
    );
  });

  it('allows teacher to post message with authorRole teacher', async () => {
    await seedBaseData();
    let threadId;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await ctx.firestore().collection('feedbackThreads').add({
        studentEmail: 'student-a@school.test',
        schoolId: 'school-a',
        scope: 'daily',
        dateKey: '2026-07-10',
        title: '7/10',
        createdBy: 'teacher-a@school.test',
        createdByName: '教員A',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        unreadByStudent: true,
        unreadByTeacher: false,
      });
      threadId = ref.id;
    });
    const teacher = testEnv.authenticatedContext('teacher-a@school.test', {
      email: 'teacher-a@school.test',
    });
    await assertSucceeds(
      teacher
        .firestore()
        .collection(`feedbackThreads/${threadId}/messages`)
        .add({
          authorEmail: 'teacher-a@school.test',
          authorRole: 'teacher',
          authorName: '教員A',
          body: 'よく頑張りました',
          createdAt: new Date(),
        })
    );
  });
});
