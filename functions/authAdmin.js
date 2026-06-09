import { randomUUID } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { canMateInteract } from "./mateScope.js";
import { sendVerificationEmail } from "./email.js";
import { assertSchoolBillingAllowsWrite } from "./billingGuards.js";

function db() {
  return getFirestore();
}

const VALID_TEACHER_ROLES = new Set(["teacher", "school_admin", "super_admin"]);

const MIN_PASSWORD_LENGTH = 8;
const VERIFICATION_SEND_WINDOW_MS = 15 * 60 * 1000;
const VERIFICATION_MAX_SENDS_PER_WINDOW = 3;
const VERIFICATION_MIN_RESEND_MS = 60 * 1000;
const VERIFICATION_MAX_ATTEMPTS = 5;

export function validatePassword(password, fieldLabel = "パスワード") {
  const value = String(password || "");
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldLabel}は${MIN_PASSWORD_LENGTH}文字以上にしてください`
    );
  }
  return value;
}

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

  await assertSchoolBillingAllowsWrite(schoolId, { allowTeacherImport: true });

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
    if (role === "super_admin" && admin.role !== "super_admin") {
      results.errors.push({ row, error: "super_admin の付与は super_admin のみ可能です" });
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
  const results = { created: 0, skipped: 0, invited: 0, errors: [] };
  let potentialNewStudents = 0;
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const name = String(row.name || "").trim();
    const initialPassword = String(row.initialPassword || "").trim();
    if (email && name && initialPassword) potentialNewStudents += 1;
  }
  await assertSchoolBillingAllowsWrite(schoolId, {
    newStudents: potentialNewStudents,
  });

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

      const userSnap = await db().collection("users").doc(email).get();
      if (userSnap.exists) {
        alreadyRegistered = true;
      }

      if (alreadyRegistered) {
        // 既存が一般ユーザー（self_registered）なら、その場昇格のための参加招待を作成する。
        const existingData = userSnap.exists ? userSnap.data() : null;
        const isSelfRegistered =
          existingData &&
          existingData.registrationType !== "school_provisioned" &&
          canDeleteSelfRegisteredAccount(existingData);
        const existingTeacher = await getTeacherRecord(email);
        if (isSelfRegistered && !existingTeacher) {
          await db().collection("schoolJoinInvites").doc(email).set({
            schoolId,
            name: name || existingData.name || "",
            grade,
            class: classNum,
            number,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: normalizeEmail(callerEmail),
          });
          results.invited += 1;
        } else {
          results.skipped += 1;
        }
        continue;
      }

      if (!initialPassword) {
        results.errors.push({
          row,
          error: "新規登録には initialPassword が必要です",
        });
        continue;
      }
      if (initialPassword.length < MIN_PASSWORD_LENGTH) {
        results.errors.push({
          row,
          error: `initialPassword は${MIN_PASSWORD_LENGTH}文字以上`,
        });
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
          onboardingComplete: false,
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
  const admin = await assertSchoolAdmin(callerEmail);
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new HttpsError("invalid-argument", "email が必要です");
  }
  validatePassword(newPassword, "newPassword");

  const userSnap = await db().collection("users").doc(normalized).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "生徒が見つかりません");
  }

  const studentSchoolId = userSnap.data()?.schoolId;
  if (admin.role !== "super_admin") {
    if (!studentSchoolId || admin.schoolId !== studentSchoolId) {
      throw new HttpsError("permission-denied", "他校の生徒のパスワードは変更できません");
    }
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

export async function sendVerificationCodeHandler({ email, purpose = "register" }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new HttpsError("invalid-argument", "有効なメールアドレスを入力してください");
  }
  const mode = purpose === "reset" ? "reset" : "register";

  const auth = getAuth();
  let authUserExists = false;
  try {
    await auth.getUserByEmail(normalized);
    authUserExists = true;
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  const userSnap = await db().collection("users").doc(normalized).get();
  const registrationType = userSnap.exists ? userSnap.data()?.registrationType : null;

  if (mode === "register") {
    if (authUserExists) {
      throw new HttpsError("already-exists", "このメールアドレスは既に登録されています");
    }
    if (registrationType === "school_provisioned") {
      throw new HttpsError(
        "failed-precondition",
        "学校登録済みのアカウントです。配布されたパスワードでログインしてください"
      );
    }
  } else {
    if (!authUserExists) {
      throw new HttpsError("not-found", "このメールアドレスは登録されていません");
    }
    if (registrationType === "school_provisioned") {
      throw new HttpsError(
        "failed-precondition",
        "学校配布アカウントのパスワードは学校管理者にお問い合わせください"
      );
    }
  }

  const codeRef = db().collection("verification_codes").doc(normalized);
  const existingSnap = await codeRef.get();
  const now = Date.now();

  if (existingSnap.exists) {
    const existing = existingSnap.data();
    const lastSentMs = existing.lastSentAt?.toMillis?.() ?? 0;
    if (lastSentMs && now - lastSentMs < VERIFICATION_MIN_RESEND_MS) {
      throw new HttpsError(
        "resource-exhausted",
        "しばらく待ってから再度お試しください"
      );
    }
    const windowStartMs = existing.sendWindowStart?.toMillis?.() ?? 0;
    const inWindow = windowStartMs && now - windowStartMs < VERIFICATION_SEND_WINDOW_MS;
    const sendCount = inWindow ? (existing.sendCount || 0) + 1 : 1;
    if (inWindow && sendCount > VERIFICATION_MAX_SENDS_PER_WINDOW) {
      throw new HttpsError(
        "resource-exhausted",
        "認証コードの送信回数が上限に達しました。しばらく待ってからお試しください"
      );
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const sendCount = existingSnap.exists
    ? (() => {
        const existing = existingSnap.data();
        const windowStartMs = existing.sendWindowStart?.toMillis?.() ?? 0;
        const inWindow =
          windowStartMs && now - windowStartMs < VERIFICATION_SEND_WINDOW_MS;
        return inWindow ? (existing.sendCount || 0) + 1 : 1;
      })()
    : 1;
  const sendWindowStart =
    existingSnap.exists &&
    (() => {
      const existing = existingSnap.data();
      const windowStartMs = existing.sendWindowStart?.toMillis?.() ?? 0;
      return windowStartMs && now - windowStartMs < VERIFICATION_SEND_WINDOW_MS;
    })()
      ? existingSnap.data().sendWindowStart
      : FieldValue.serverTimestamp();

  await codeRef.set({
    code,
    expiresAt,
    purpose: mode,
    verified: false,
    attemptCount: 0,
    sendCount,
    sendWindowStart,
    lastSentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendVerificationEmail({ to: normalized, code, purpose: mode });

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
  if (!snap.exists) {
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
    const attempts = (data.attemptCount || 0) + 1;
    if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
      await snap.ref.delete();
      throw new HttpsError(
        "resource-exhausted",
        "認証の試行回数が上限に達しました。最初からやり直してください"
      );
    }
    await snap.ref.set({ attemptCount: attempts }, { merge: true });
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
  if (!normalized) {
    throw new HttpsError("invalid-argument", "email が必要です");
  }
  validatePassword(password);

  const codeSnap = await db().collection("verification_codes").doc(normalized).get();
  if (!codeSnap.exists || !codeSnap.data()?.verified) {
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

  await db().collection("users").doc(normalized).set(
    buildSelfRegisteredUserDoc(normalized, { schoolId: schoolId || null })
  );

  await codeSnap.ref.delete();

  const customToken = await auth.createCustomToken(userRecord.uid);
  return { success: true, uid: userRecord.uid, customToken };
}

function buildSelfRegisteredUserDoc(email, extra = {}) {
  const normalized = normalizeEmail(email);
  return {
    role: "student",
    name: normalized.split("@")[0],
    nameLower: normalized.split("@")[0].toLowerCase(),
    schoolId: null,
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
    ...extra,
  };
}

async function resolveCallableUserEmail(request) {
  const tokenEmail = normalizeEmail(request.auth?.token?.email);
  if (tokenEmail) return tokenEmail;
  if (!request.auth?.uid) return "";
  const userRecord = await getAuth().getUser(request.auth.uid);
  return normalizeEmail(userRecord.email);
}

export async function registerAppleStudentHandler(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const signInProvider = request.auth.token.firebase?.sign_in_provider;
  if (signInProvider !== "apple.com") {
    throw new HttpsError("permission-denied", "Apple ID でログインしてください");
  }

  const email = await resolveCallableUserEmail(request);
  if (!email) {
    throw new HttpsError("failed-precondition", "Apple ID からメールアドレスを取得できませんでした");
  }

  const userRef = db().collection("users").doc(email);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const userData = userSnap.data() || {};
    const registrationType = userData.registrationType;
    if (registrationType === "school_provisioned") {
      throw new HttpsError(
        "failed-precondition",
        "学校登録済みのアカウントです。配布されたパスワードでログインしてください"
      );
    }
    if (registrationType && registrationType !== "self_registered") {
      throw new HttpsError("failed-precondition", "このアカウントでは Apple ID 登録を利用できません");
    }
    if (!registrationType && !looksLikeSchoolProvisioned(userData)) {
      await userRef.set({ registrationType: "self_registered" }, { merge: true });
    }
    return { success: true, created: false, email };
  }

  await userRef.set(
    buildSelfRegisteredUserDoc(email, {
      authProvider: "apple.com",
    })
  );

  return { success: true, created: true, email };
}

export async function resetPasswordWithCodeHandler({ email, code, newPassword }) {
  const normalized = normalizeEmail(email);
  const inputCode = String(code || "").trim();
  if (!normalized || !inputCode) {
    throw new HttpsError("invalid-argument", "email と code が必要です");
  }
  validatePassword(newPassword, "新しいパスワード");

  const snap = await db().collection("verification_codes").doc(normalized).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "認証コードが見つかりません");
  }
  const data = snap.data();
  if (data.purpose !== "reset" || !data.verified) {
    throw new HttpsError("failed-precondition", "メール認証が完了していません");
  }
  if (data.code !== inputCode) {
    const attempts = (data.attemptCount || 0) + 1;
    if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
      await snap.ref.delete();
      throw new HttpsError(
        "resource-exhausted",
        "認証の試行回数が上限に達しました。最初からやり直してください"
      );
    }
    await snap.ref.set({ attemptCount: attempts }, { merge: true });
    throw new HttpsError("invalid-argument", "認証コードが正しくありません");
  }

  const auth = getAuth();
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(normalized);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "このメールアドレスは登録されていません");
    }
    throw err;
  }

  await auth.updateUser(userRecord.uid, { password: newPassword });
  await snap.ref.delete();

  const customToken = await auth.createCustomToken(userRecord.uid);
  return { success: true, customToken };
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

    if (!mySnap.exists || !theirSnap.exists) {
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

const MATE_INVITE_TTL_MS = 30 * 60 * 1000;

function getAppOrigin(origin) {
  const trimmed = String(origin || process.env.APP_ORIGIN || "").trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  return "https://tsureben.web.app";
}

function buildInviteUrl(token, origin) {
  return `${getAppOrigin(origin)}/mate-invite/${token}`;
}

function isInviteExpired(expiresAt) {
  if (!expiresAt) return true;
  const ms = expiresAt.toMillis ? expiresAt.toMillis() : new Date(expiresAt).getTime();
  return Date.now() >= ms;
}

async function getInviteDoc(token) {
  const normalized = String(token || "").trim();
  if (!normalized) return null;
  const snap = await db().collection("mateInvites").doc(normalized).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getUserRecord(email) {
  const snap = await db().collection("users").doc(normalizeEmail(email)).get();
  if (!snap.exists) return null;
  return { email: snap.id, ...snap.data() };
}

export async function createMateInviteHandler(callerEmail, { origin } = {}) {
  const inviterEmail = normalizeEmail(callerEmail);
  const inviter = await getUserRecord(inviterEmail);
  if (!inviter) {
    throw new HttpsError("not-found", "ユーザーが見つかりません");
  }

  const token = randomUUID();
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + MATE_INVITE_TTL_MS);

  await db().collection("mateInvites").doc(token).set({
    inviterEmail,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  return {
    token,
    inviteUrl: buildInviteUrl(token, origin),
    expiresAt: expiresAt.toMillis(),
    inviterName: inviter.name || inviterEmail,
  };
}

export async function getMateInvitePreviewHandler(_callerEmail, { token } = {}) {
  const invite = await getInviteDoc(token);
  if (!invite) {
    return { invalid: true, expired: false };
  }

  const expired = isInviteExpired(invite.expiresAt);
  const inviter = await getUserRecord(invite.inviterEmail);
  if (!inviter) {
    return { invalid: true, expired };
  }

  const expiresAtMs = invite.expiresAt.toMillis
    ? invite.expiresAt.toMillis()
    : new Date(invite.expiresAt).getTime();

  return {
    invalid: false,
    expired,
    inviterName: inviter.name || invite.inviterEmail,
    inviterGrade: inviter.grade || null,
    inviterClass: inviter.class || null,
    expiresAt: expiresAtMs,
  };
}

export async function redeemMateInviteHandler(callerEmail, { token } = {}) {
  const inviteeEmail = normalizeEmail(callerEmail);
  const invite = await getInviteDoc(token);
  if (!invite) {
    throw new HttpsError("not-found", "招待が見つかりません");
  }
  if (isInviteExpired(invite.expiresAt)) {
    throw new HttpsError("failed-precondition", "招待の有効期限が切れています");
  }

  const inviterEmail = normalizeEmail(invite.inviterEmail);
  if (inviterEmail === inviteeEmail) {
    throw new HttpsError("invalid-argument", "自分自身には申請できません");
  }

  const dbRef = db();
  let status = "pending_created";

  await dbRef.runTransaction(async (tx) => {
    const inviteeRef = dbRef.collection("users").doc(inviteeEmail);
    const inviterRef = dbRef.collection("users").doc(inviterEmail);
    const [inviteeSnap, inviterSnap] = await Promise.all([
      tx.get(inviteeRef),
      tx.get(inviterRef),
    ]);

    if (!inviteeSnap.exists || !inviterSnap.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const invitee = { email: inviteeSnap.id, ...inviteeSnap.data() };
    const inviter = { email: inviterSnap.id, ...inviterSnap.data() };

    if (!canMateInteract(invitee, inviter)) {
      throw new HttpsError("permission-denied", "申請できないユーザーです");
    }

    const mutualMates = invitee.mutualMates || [];
    if (mutualMates.includes(inviterEmail)) {
      status = "already_mates";
      return;
    }

    const pendingSent = invitee.pendingSent || [];
    if (pendingSent.includes(inviterEmail)) {
      status = "already_pending";
      return;
    }

    tx.update(inviteeRef, {
      pendingSent: FieldValue.arrayUnion(inviterEmail),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(inviterRef, {
      pendingReceived: FieldValue.arrayUnion(inviteeEmail),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true, status };
}

export async function cancelMateRequestHandler(callerEmail, { toEmail } = {}) {
  const myEmail = normalizeEmail(callerEmail);
  const theirEmail = normalizeEmail(toEmail);
  if (!theirEmail) {
    throw new HttpsError("invalid-argument", "toEmail が必要です");
  }

  const dbRef = db();
  await dbRef.runTransaction(async (tx) => {
    const myRef = dbRef.collection("users").doc(myEmail);
    const theirRef = dbRef.collection("users").doc(theirEmail);
    const [mySnap, theirSnap] = await Promise.all([tx.get(myRef), tx.get(theirRef)]);

    if (!mySnap.exists || !theirSnap.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません");
    }

    const pendingSent = mySnap.data().pendingSent || [];
    if (!pendingSent.includes(theirEmail)) {
      throw new HttpsError("failed-precondition", "取消できる申請がありません");
    }

    tx.update(myRef, {
      pendingSent: FieldValue.arrayRemove(theirEmail),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(theirRef, {
      pendingReceived: FieldValue.arrayRemove(myEmail),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
}

const MATE_REFERENCE_FIELDS = [
  "mutualMates",
  "pendingSent",
  "pendingReceived",
  "hiddenMates",
  "hiddenRequests",
];

const SCHOOL_PROVISIONED_DELETE_MESSAGE =
  "学校配布アカウントは学校管理者にお問い合わせください";

function looksLikeSchoolProvisioned(userData) {
  if (!userData) return false;
  if (userData.registrationType === "school_provisioned") return true;
  if (userData.registrationType === "self_registered") return false;
  if (userData.mustChangePassword === true) return true;
  if (
    userData.grade != null &&
    userData.class != null &&
    userData.number != null
  ) {
    return true;
  }
  return false;
}

export function canDeleteSelfRegisteredAccount(userData) {
  if (!userData) return false;
  if (userData.registrationType === "school_provisioned") return false;
  if (userData.registrationType === "self_registered") return true;
  return !looksLikeSchoolProvisioned(userData);
}

async function batchArrayRemoveFromQuery(dbRef, collectionName, field, email) {
  const snap = await dbRef
    .collection(collectionName)
    .where(field, "array-contains", email)
    .get();
  if (snap.empty) return;

  let batch = dbRef.batch();
  let ops = 0;
  for (const docSnap of snap.docs) {
    batch.update(docSnap.ref, {
      [field]: FieldValue.arrayRemove(email),
      updatedAt: FieldValue.serverTimestamp(),
    });
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = dbRef.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

async function deleteUserScopedData(dbRef, email) {
  const threadsSnap = await dbRef
    .collection("feedbackThreads")
    .where("studentEmail", "==", email)
    .get();
  for (const threadDoc of threadsSnap.docs) {
    await dbRef.recursiveDelete(threadDoc.ref);
  }

  await dbRef.recursiveDelete(dbRef.collection("plans").doc(email));
  await dbRef.recursiveDelete(dbRef.collection("logs").doc(email));

  const sessionRef = dbRef.collection("activeSessions").doc(email);
  const sessionSnap = await sessionRef.get();
  if (sessionSnap.exists) {
    await sessionRef.delete();
  }

  for (const field of MATE_REFERENCE_FIELDS) {
    await batchArrayRemoveFromQuery(dbRef, "users", field, email);
  }

  await batchArrayRemoveFromQuery(dbRef, "activeSessions", "mateEmails", email);

  const invitesSnap = await dbRef
    .collection("mateInvites")
    .where("inviterEmail", "==", email)
    .get();
  if (!invitesSnap.empty) {
    let batch = dbRef.batch();
    let ops = 0;
    for (const inviteDoc of invitesSnap.docs) {
      batch.delete(inviteDoc.ref);
      ops += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = dbRef.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  }

  const codeRef = dbRef.collection("verification_codes").doc(email);
  const codeSnap = await codeRef.get();
  if (codeSnap.exists) {
    await codeRef.delete();
  }

  await dbRef.collection("users").doc(email).delete();
}

export async function deleteSelfRegisteredAccountHandler(callerEmail) {
  const email = normalizeEmail(callerEmail);
  if (!email) {
    throw new HttpsError("invalid-argument", "メールアドレスが必要です");
  }

  const teacher = await getTeacherRecord(email);
  if (teacher) {
    throw new HttpsError(
      "permission-denied",
      "教員・管理者アカウントはこの機能では削除できません"
    );
  }

  const userSnap = await db().collection("users").doc(email).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "ユーザーが見つかりません");
  }

  const userData = userSnap.data();
  if (!canDeleteSelfRegisteredAccount(userData)) {
    throw new HttpsError("failed-precondition", SCHOOL_PROVISIONED_DELETE_MESSAGE);
  }

  const dbRef = db();
  const auth = getAuth();

  await deleteUserScopedData(dbRef, email);

  try {
    const userRecord = await auth.getUserByEmail(email);
    await auth.deleteUser(userRecord.uid);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  return { success: true };
}

const ACCOUNT_TRANSFER_TTL_MS = 15 * 60 * 1000;

/**
 * source のユーザーデータ（学習計画・記録・教科カタログ・メイト関係）を target にコピー/マージする。
 * - plans/logs は移行先優先（同一 dateKey が既にあればスキップ）
 * - メイト関係は双方向に source -> target に付け替え
 * - 学外メイトが含まれる場合は target.mateScope を「学内外」にする
 * 学校側が設定したプロフィール項目（schoolId/grade/class/number/name/role など）は上書きしない。
 */
async function copyUserScopedData(dbRef, source, target) {
  const sourceEmail = normalizeEmail(source);
  const targetEmail = normalizeEmail(target);

  const [sourceSnap, targetSnap] = await Promise.all([
    dbRef.collection("users").doc(sourceEmail).get(),
    dbRef.collection("users").doc(targetEmail).get(),
  ]);
  if (!sourceSnap.exists) {
    throw new HttpsError("not-found", "引き継ぎ元のデータが見つかりません");
  }
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "引き継ぎ先のアカウントが見つかりません");
  }

  const sourceData = sourceSnap.data();
  const targetData = targetSnap.data();
  const targetSchoolId = targetData.schoolId ?? null;

  // 1. plans / logs をコピー（移行先優先）
  await copyDaysSubcollection(dbRef, "plans", sourceEmail, targetEmail);
  await copyDaysSubcollection(dbRef, "logs", sourceEmail, targetEmail);

  // 2. メイト関係を双方向に source -> target へ付け替え
  const { hasOutOfSchoolMate } = await reassignMateReferences(
    dbRef,
    sourceEmail,
    targetEmail,
    targetSchoolId,
    sourceData
  );

  // 3. target ユーザードキュメントを更新（教科カタログ + メイト配列をマージ）
  const mergedSubjectCatalog = {
    ...(sourceData.subjectCatalog || {}),
    ...(targetData.subjectCatalog || {}),
  };
  const targetUpdate = {
    subjectCatalog: mergedSubjectCatalog,
    updatedAt: FieldValue.serverTimestamp(),
  };
  for (const field of MATE_REFERENCE_FIELDS) {
    const combined = new Set(
      (targetData[field] || []).map(normalizeEmail).filter(Boolean)
    );
    for (const entry of sourceData[field] || []) {
      const ne = normalizeEmail(entry);
      if (ne && ne !== targetEmail && ne !== sourceEmail) combined.add(ne);
    }
    targetUpdate[field] = [...combined];
  }
  if (hasOutOfSchoolMate) {
    targetUpdate.mateScope = "学内外";
  }
  await dbRef.collection("users").doc(targetEmail).set(targetUpdate, { merge: true });
}

async function copyDaysSubcollection(dbRef, collectionName, source, target) {
  const srcSnap = await dbRef
    .collection(collectionName)
    .doc(source)
    .collection("days")
    .get();
  if (srcSnap.empty) return;

  let batch = dbRef.batch();
  let ops = 0;
  for (const dayDoc of srcSnap.docs) {
    const targetRef = dbRef
      .collection(collectionName)
      .doc(target)
      .collection("days")
      .doc(dayDoc.id);
    const targetDaySnap = await targetRef.get();
    if (targetDaySnap.exists) continue; // 移行先優先
    batch.set(targetRef, dayDoc.data());
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = dbRef.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

/**
 * source のメイト関係を相手側ドキュメントも含めて target へ付け替える。
 * mutualMates は相手側も mutualMates、pendingSent は相手側 pendingReceived、
 * pendingReceived は相手側 pendingSent を書き換える。
 * 配列は読み込んで JS 側で source -> target に置換した結果を書き込む（同一フィールドへの
 * 複数 transform 競合を避けるため）。
 */
async function reassignMateReferences(dbRef, source, target, targetSchoolId, sourceData) {
  const friendFieldMap = new Map(); // friendEmail -> Set<friendField>
  const addFriendField = (email, friendField) => {
    const e = normalizeEmail(email);
    if (!e || e === source || e === target) return;
    if (!friendFieldMap.has(e)) friendFieldMap.set(e, new Set());
    friendFieldMap.get(e).add(friendField);
  };

  for (const e of sourceData.mutualMates || []) addFriendField(e, "mutualMates");
  for (const e of sourceData.pendingSent || []) addFriendField(e, "pendingReceived");
  for (const e of sourceData.pendingReceived || []) addFriendField(e, "pendingSent");

  let hasOutOfSchoolMate = false;
  let batch = dbRef.batch();
  let ops = 0;

  for (const [friendEmail, fields] of friendFieldMap) {
    const friendRef = dbRef.collection("users").doc(friendEmail);
    const friendSnap = await friendRef.get();
    if (!friendSnap.exists) continue;
    const fdata = friendSnap.data();

    const friendSchoolId = fdata.schoolId ?? null;
    if (!targetSchoolId || friendSchoolId !== targetSchoolId) {
      hasOutOfSchoolMate = true;
    }

    const update = { updatedAt: FieldValue.serverTimestamp() };
    for (const field of fields) {
      const arr = (fdata[field] || []).filter(
        (x) => normalizeEmail(x) !== source
      );
      if (!arr.some((x) => normalizeEmail(x) === target)) arr.push(target);
      update[field] = arr;
    }
    batch.update(friendRef, update);
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = dbRef.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  return { hasOutOfSchoolMate };
}

/** 移行元アカウントを無効化し、メイト配列をクリアして tombstone を残す。 */
async function disableMigratedSourceAccount(dbRef, source, target) {
  const sessionRef = dbRef.collection("activeSessions").doc(source);
  const sessionSnap = await sessionRef.get();
  if (sessionSnap.exists) {
    await sessionRef.delete();
  }
  await batchArrayRemoveFromQuery(dbRef, "activeSessions", "mateEmails", source);

  await dbRef.collection("users").doc(source).set(
    {
      migratedTo: target,
      migratedAt: FieldValue.serverTimestamp(),
      disabledAt: FieldValue.serverTimestamp(),
      mutualMates: [],
      pendingSent: [],
      pendingReceived: [],
      hiddenMates: [],
      hiddenRequests: [],
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const auth = getAuth();
  try {
    const userRecord = await auth.getUserByEmail(source);
    await auth.updateUser(userRecord.uid, { disabled: true });
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }
}

/** 一般ユーザーが管理アカウントへ引き継ぐためのコードを発行する（コードフロー / 別メール）。 */
export async function createAccountTransferCodeHandler(callerEmail) {
  const sourceEmail = normalizeEmail(callerEmail);
  if (!sourceEmail) {
    throw new HttpsError("invalid-argument", "メールアドレスが必要です");
  }

  const teacher = await getTeacherRecord(sourceEmail);
  if (teacher) {
    throw new HttpsError(
      "permission-denied",
      "教員・管理者アカウントは引き継ぎできません"
    );
  }

  const userSnap = await db().collection("users").doc(sourceEmail).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "ユーザーが見つかりません");
  }
  if (!canDeleteSelfRegisteredAccount(userSnap.data())) {
    throw new HttpsError(
      "failed-precondition",
      "このアカウントは引き継ぎコードを発行できません"
    );
  }

  const code = generateCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + ACCOUNT_TRANSFER_TTL_MS);
  await db().collection("accountTransfers").doc(code).set({
    sourceEmail,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  return { code, expiresAt: expiresAt.toMillis() };
}

/** 管理アカウント側で引き継ぎコードを使用し、データを移行する（コードフロー / 別メール）。 */
export async function redeemAccountTransferHandler(callerEmail, { code } = {}) {
  const targetEmail = normalizeEmail(callerEmail);
  const inputCode = String(code || "").trim();
  if (!targetEmail) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  if (!inputCode) {
    throw new HttpsError("invalid-argument", "引き継ぎコードを入力してください");
  }

  const targetSnap = await db().collection("users").doc(targetEmail).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "アカウントが見つかりません");
  }
  if (targetSnap.data()?.registrationType !== "school_provisioned") {
    throw new HttpsError(
      "failed-precondition",
      "学校・塾から配布されたアカウントでのみ引き継ぎできます"
    );
  }

  const codeRef = db().collection("accountTransfers").doc(inputCode);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists) {
    throw new HttpsError("not-found", "引き継ぎコードが見つかりません");
  }
  const codeData = codeSnap.data();
  if (codeData.used) {
    throw new HttpsError("failed-precondition", "この引き継ぎコードは使用済みです");
  }
  if (isInviteExpired(codeData.expiresAt)) {
    throw new HttpsError("deadline-exceeded", "引き継ぎコードの有効期限が切れています");
  }

  const sourceEmail = normalizeEmail(codeData.sourceEmail);
  if (!sourceEmail) {
    throw new HttpsError("failed-precondition", "引き継ぎ元が不明です");
  }
  if (sourceEmail === targetEmail) {
    throw new HttpsError("invalid-argument", "同じアカウントには引き継げません");
  }

  const sourceSnap = await db().collection("users").doc(sourceEmail).get();
  if (!sourceSnap.exists) {
    throw new HttpsError("not-found", "引き継ぎ元のデータが見つかりません");
  }
  if (!canDeleteSelfRegisteredAccount(sourceSnap.data())) {
    throw new HttpsError("failed-precondition", "引き継ぎ元アカウントが不正です");
  }

  const dbRef = db();
  await copyUserScopedData(dbRef, sourceEmail, targetEmail);
  await codeRef.set(
    { used: true, usedAt: FieldValue.serverTimestamp(), targetEmail },
    { merge: true }
  );
  await disableMigratedSourceAccount(dbRef, sourceEmail, targetEmail);

  return { success: true, sourceEmail };
}

/** 一般ユーザー宛ての参加招待（同一メール）を返す。 */
export async function getPendingSchoolJoinHandler(callerEmail) {
  const email = normalizeEmail(callerEmail);
  if (!email) {
    throw new HttpsError("invalid-argument", "メールアドレスが必要です");
  }

  const inviteSnap = await db().collection("schoolJoinInvites").doc(email).get();
  if (!inviteSnap.exists) {
    return { invite: null };
  }
  const invite = inviteSnap.data();

  let schoolName = "";
  if (invite.schoolId) {
    const schoolSnap = await db().collection("schools").doc(invite.schoolId).get();
    schoolName = schoolSnap.exists ? schoolSnap.data()?.name || "" : "";
  }

  return {
    invite: {
      schoolId: invite.schoolId || null,
      schoolName,
      grade: invite.grade || "",
      class: invite.class || "",
      number: invite.number || "",
    },
  };
}

/** 一般ユーザーが参加招待を承認し、その場で管理アカウントへ昇格する（同一メール）。 */
export async function acceptSchoolJoinHandler(callerEmail) {
  const email = normalizeEmail(callerEmail);
  if (!email) {
    throw new HttpsError("invalid-argument", "メールアドレスが必要です");
  }

  const teacher = await getTeacherRecord(email);
  if (teacher) {
    throw new HttpsError(
      "permission-denied",
      "教員・管理者アカウントでは利用できません"
    );
  }

  const inviteRef = db().collection("schoolJoinInvites").doc(email);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "参加の招待が見つかりません");
  }
  const invite = inviteSnap.data();

  const userSnap = await db().collection("users").doc(email).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "ユーザーが見つかりません");
  }
  if (!canDeleteSelfRegisteredAccount(userSnap.data())) {
    throw new HttpsError("failed-precondition", "このアカウントは参加できません");
  }

  if (!invite.schoolId) {
    throw new HttpsError("failed-precondition", "招待の情報が不正です");
  }

  // 在籍数の上限・契約状態を確認（1名追加）
  await assertSchoolBillingAllowsWrite(invite.schoolId, { newStudents: 1 });

  await db().collection("users").doc(email).set(
    {
      schoolId: invite.schoolId,
      role: "student",
      registrationType: "school_provisioned",
      grade: invite.grade || "",
      class: invite.class || "",
      number: invite.number || "",
      profileComplete: Boolean(invite.grade && invite.class && invite.number),
      mustChangePassword: false,
      onboardingComplete: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await inviteRef.delete();

  return { success: true, schoolId: invite.schoolId };
}
