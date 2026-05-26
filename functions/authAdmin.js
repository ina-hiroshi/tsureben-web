import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

function db() {
  return getFirestore();
}

const VALID_TEACHER_ROLES = new Set(["teacher", "school_admin", "super_admin"]);

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function getTeacherRecord(email) {
  const snap = await db().collection("teachers").doc(normalizeEmail(email)).get();
  return snap.exists ? snap.data() : null;
}

export async function assertSchoolAdmin(callerEmail) {
  const teacher = await getTeacherRecord(callerEmail);
  if (!teacher) {
    throw new HttpsError("permission-denied", "教員権限がありません");
  }
  if (!["school_admin", "super_admin"].includes(teacher.role)) {
    throw new HttpsError("permission-denied", "管理者権限がありません");
  }
  return teacher;
}

export async function assertSuperAdmin(callerEmail) {
  const teacher = await getTeacherRecord(callerEmail);
  if (!teacher || teacher.role !== "super_admin") {
    throw new HttpsError("permission-denied", "super_admin 権限が必要です");
  }
  return teacher;
}

export async function createSchoolHandler(callerEmail, { name, settings = {} }) {
  await assertSuperAdmin(callerEmail);
  if (!name?.trim()) {
    throw new HttpsError("invalid-argument", "学校名が必要です");
  }
  const ref = db().collection("schools").doc();
  await ref.set({
    name: name.trim(),
    settings: settings || {},
    createdAt: FieldValue.serverTimestamp(),
    createdBy: normalizeEmail(callerEmail),
  });
  return { schoolId: ref.id, name: name.trim() };
}

export async function bulkImportTeachersHandler(callerEmail, { schoolId, rows }) {
  const admin = await assertSchoolAdmin(callerEmail);
  if (!schoolId) {
    throw new HttpsError("invalid-argument", "schoolId が必要です");
  }
  if (admin.role !== "super_admin" && admin.schoolId !== schoolId) {
    throw new HttpsError("permission-denied", "他校の教員は登録できません");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpsError("invalid-argument", "rows が空です");
  }

  const results = { created: 0, updated: 0, errors: [] };

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const name = String(row.name || "").trim();
    const role = String(row.role || "teacher").trim();
    if (!email || !name) {
      results.errors.push({ row, error: "email と name は必須です" });
      continue;
    }
    if (!VALID_TEACHER_ROLES.has(role)) {
      results.errors.push({ row, error: "role が不正です" });
      continue;
    }
    try {
      await db().collection("teachers").doc(email).set(
        {
          schoolId,
          name,
          role,
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: normalizeEmail(callerEmail),
        },
        { merge: true }
      );
      results.updated += 1;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }

  return results;
}

export async function bulkImportStudentsHandler(callerEmail, { schoolId, rows }) {
  const admin = await assertSchoolAdmin(callerEmail);
  if (!schoolId) {
    throw new HttpsError("invalid-argument", "schoolId が必要です");
  }
  if (admin.role !== "super_admin" && admin.schoolId !== schoolId) {
    throw new HttpsError("permission-denied", "他校の生徒は登録できません");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpsError("invalid-argument", "rows が空です");
  }

  const auth = getAuth();
  const results = { created: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const name = String(row.name || "").trim();
    const grade = String(row.grade || "").trim();
    const classNum = String(row.class || "").trim();
    const number = String(row.number || "").trim();
    const initialPassword = String(row.initialPassword || "").trim();

    if (!email || !name) {
      results.errors.push({ row, error: "email と name は必須です" });
      continue;
    }

    try {
      let alreadyRegistered = false;
      try {
        await auth.getUserByEmail(email);
        alreadyRegistered = true;
      } catch (err) {
        if (err.code !== "auth/user-not-found") throw err;
      }

      if (!alreadyRegistered) {
        const userSnap = await db().collection("users").doc(email).get();
        if (userSnap.exists()) {
          alreadyRegistered = true;
        }
      }

      if (alreadyRegistered) {
        results.skipped += 1;
        continue;
      }

      if (!initialPassword) {
        results.errors.push({
          row,
          error: "新規登録には initialPassword が必要です",
        });
        continue;
      }
      if (initialPassword.length < 6) {
        results.errors.push({ row, error: "initialPassword は6文字以上" });
        continue;
      }

      await auth.createUser({
        email,
        password: initialPassword,
        displayName: name,
        emailVerified: true,
      });

      const profileComplete = Boolean(grade && classNum && number);
      await db().collection("users").doc(email).set(
        {
          schoolId,
          role: "student",
          name,
          nameLower: name.toLowerCase(),
          grade,
          class: classNum,
          number,
          shareScope: "学年のみ",
          mateScope: "学内のみ",
          mutualMates: [],
          pendingSent: [],
          pendingReceived: [],
          hiddenMates: [],
          hiddenRequests: [],
          subjectCatalog: {},
          registrationType: "school_provisioned",
          profileComplete,
          mustChangePassword: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      results.created += 1;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }

  return results;
}

export async function resetStudentPasswordHandler(callerEmail, { email, newPassword }) {
  await assertSchoolAdmin(callerEmail);
  const normalized = normalizeEmail(email);
  if (!normalized || !newPassword || newPassword.length < 6) {
    throw new HttpsError("invalid-argument", "email と newPassword(6文字以上) が必要です");
  }

  const userSnap = await db().collection("users").doc(normalized).get();
  if (!userSnap.exists()) {
    throw new HttpsError("not-found", "生徒が見つかりません");
  }

  const auth = getAuth();
  const userRecord = await auth.getUserByEmail(normalized);
  await auth.updateUser(userRecord.uid, { password: newPassword });
  await db().collection("users").doc(normalized).set(
    { mustChangePassword: true, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { success: true };
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerificationCodeHandler({ email }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new HttpsError("invalid-argument", "有効なメールアドレスを入力してください");
  }

  const auth = getAuth();
  try {
    await auth.getUserByEmail(normalized);
    throw new HttpsError("already-exists", "このメールアドレスは既に登録されています");
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  const userSnap = await db().collection("users").doc(normalized).get();
  if (userSnap.exists() && userSnap.data()?.registrationType === "school_provisioned") {
    throw new HttpsError(
      "failed-precondition",
      "学校登録済みのアカウントです。配布されたパスワードでログインしてください"
    );
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db().collection("verification_codes").doc(normalized).set({
    code,
    expiresAt,
    verified: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 開発・初期運用: コードをレスポンスに含める（本番ではメール送信に差し替え）
  console.log(`Verification code for ${normalized}: ${code}`);
  return {
    success: true,
    message: "認証コードを送信しました",
    devCode: process.env.FUNCTIONS_EMULATOR ? code : undefined,
  };
}

export async function verifyCodeHandler({ email, code }) {
  const normalized = normalizeEmail(email);
  const inputCode = String(code || "").trim();
  if (!normalized || !inputCode) {
    throw new HttpsError("invalid-argument", "email と code が必要です");
  }

  const snap = await db().collection("verification_codes").doc(normalized).get();
  if (!snap.exists()) {
    throw new HttpsError("not-found", "認証コードが見つかりません");
  }

  const data = snap.data();
  if (data.verified) {
    return { success: true, alreadyVerified: true };
  }
  if (new Date(data.expiresAt).getTime() < Date.now()) {
    throw new HttpsError("deadline-exceeded", "認証コードの有効期限が切れています");
  }
  if (data.code !== inputCode) {
    throw new HttpsError("invalid-argument", "認証コードが正しくありません");
  }

  await snap.ref.set({ verified: true, verifiedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
}

export async function migrateLegacyDataHandler(callerEmail, { defaultSchoolId, defaultSchoolName }) {
  await assertSuperAdmin(callerEmail);

  let schoolId = defaultSchoolId;
  if (!schoolId && defaultSchoolName) {
    const ref = db().collection("schools").doc();
    await ref.set({
      name: defaultSchoolName.trim(),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: normalizeEmail(callerEmail),
    });
    schoolId = ref.id;
  }
  if (!schoolId) {
    throw new HttpsError("invalid-argument", "defaultSchoolId または defaultSchoolName が必要です");
  }

  const usersSnap = await db().collection("users").get();
  let usersUpdated = 0;
  let teachersCreated = 0;

  for (const docSnap of usersSnap.docs) {
    const email = docSnap.id;
    const data = docSnap.data();
    const updates = {};

    if (!data.schoolId) {
      updates.schoolId = schoolId;
    }
    if (data.role == null && !data.teacher) {
      updates.role = "student";
    }
    if (data.profileComplete == null) {
      updates.profileComplete = Boolean(data.grade && data.class && data.number);
    }
    if (Object.keys(updates).length > 0) {
      await docSnap.ref.set(updates, { merge: true });
      usersUpdated += 1;
    }

    if (data.teacher === true) {
      await db().collection("teachers").doc(email).set(
        {
          schoolId: data.schoolId || schoolId,
          name: data.name || email,
          role: "teacher",
          migratedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      teachersCreated += 1;
    }
  }

  return { schoolId, usersUpdated, teachersCreated };
}

export async function createSelfRegisteredStudentHandler({ email, password, schoolId = null }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !password || password.length < 6) {
    throw new HttpsError("invalid-argument", "email と password(6文字以上) が必要です");
  }

  const codeSnap = await db().collection("verification_codes").doc(normalized).get();
  if (!codeSnap.exists() || !codeSnap.data()?.verified) {
    throw new HttpsError("failed-precondition", "メール認証が完了していません");
  }

  const auth = getAuth();
  try {
    await auth.getUserByEmail(normalized);
    throw new HttpsError("already-exists", "このメールアドレスは既に登録されています");
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  const userRecord = await auth.createUser({
    email: normalized,
    password,
    emailVerified: true,
  });

  await db().collection("users").doc(normalized).set({
    role: "student",
    name: normalized.split("@")[0],
    nameLower: normalized.split("@")[0].toLowerCase(),
    schoolId: schoolId || null,
    registrationType: "self_registered",
    profileComplete: false,
    shareScope: "学年のみ",
    mateScope: "学内のみ",
    mutualMates: [],
    pendingSent: [],
    pendingReceived: [],
    hiddenMates: [],
    hiddenRequests: [],
    subjectCatalog: {},
    createdAt: FieldValue.serverTimestamp(),
  });

  await codeSnap.ref.delete();

  return { success: true, uid: userRecord.uid };
}

export async function acceptMateRequestHandler(callerEmail, { fromEmail }) {
  const myEmail = normalizeEmail(callerEmail);
  const theirEmail = normalizeEmail(fromEmail);
  if (!theirEmail) {
    throw new HttpsError("invalid-argument", "fromEmail が必要です");
  }

  const dbRef = db();
  await dbRef.runTransaction(async (tx) => {
    const myRef = dbRef.collection("users").doc(myEmail);
    const theirRef = dbRef.collection("users").doc(theirEmail);
    const [mySnap, theirSnap] = await Promise.all([tx.get(myRef), tx.get(theirRef)]);

    if (!mySnap.exists() || !theirSnap.exists()) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const myData = mySnap.data();
    const pendingReceived = myData.pendingReceived || [];
    if (!pendingReceived.includes(theirEmail)) {
      throw new HttpsError("failed-precondition", "承認待ちの申請がありません");
    }

    tx.update(myRef, {
      pendingReceived: FieldValue.arrayRemove(theirEmail),
      mutualMates: FieldValue.arrayUnion(theirEmail),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(theirRef, {
      pendingSent: FieldValue.arrayRemove(myEmail),
      mutualMates: FieldValue.arrayUnion(myEmail),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
}
