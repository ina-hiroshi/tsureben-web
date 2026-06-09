import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { LEGACY_FREE_PLAN } from "./billingConfig.js";

const BATCH_LIMIT = 400;

function db() {
  return getFirestore();
}

async function findSchoolByStripeCustomerId(customerId) {
  const snap = await db()
    .collection("schools")
    .where("billing.stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { ref: snap.docs[0].ref, id: snap.docs[0].id, data: snap.docs[0].data() };
}

async function deleteSchoolTeachers(schoolId) {
  const snap = await db().collection("teachers").where("schoolId", "==", schoolId).get();
  let deleted = 0;
  let batch = db().batch();
  let ops = 0;

  for (const docSnap of snap.docs) {
    if (docSnap.data()?.role === "super_admin") continue;
    batch.delete(docSnap.ref);
    deleted += 1;
    ops += 1;
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db().batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return { deleted };
}

async function convertSchoolStudentsToGeneralUsers(schoolId) {
  const snap = await db()
    .collection("users")
    .where("schoolId", "==", schoolId)
    .where("role", "==", "student")
    .get();

  let converted = 0;
  let batch = db().batch();
  let ops = 0;

  for (const docSnap of snap.docs) {
    batch.update(docSnap.ref, {
      schoolId: null,
      registrationType: "self_registered",
      mustChangePassword: FieldValue.delete(),
      onboardingComplete: FieldValue.delete(),
      mateScope: "学内外",
      updatedAt: FieldValue.serverTimestamp(),
    });
    converted += 1;
    ops += 1;
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db().batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return { converted };
}

/**
 * サブスクリプション解約時: 当該校の教員レコードを削除し、
 * 学校配布生徒を一般ユーザー（self_registered）へ移行する。
 */
export async function processSchoolSubscriptionCancellation(customerId) {
  if (!customerId) {
    return { processed: false, reason: "no_customer" };
  }

  const school = await findSchoolByStripeCustomerId(customerId);
  if (!school) {
    return { processed: false, reason: "school_not_found" };
  }

  if (school.data.cancellationProcessedAt) {
    return { processed: false, reason: "already_processed", schoolId: school.id };
  }

  const billing = school.data.billing || {};
  if (billing.plan === LEGACY_FREE_PLAN) {
    return { processed: false, reason: "legacy_free", schoolId: school.id };
  }

  const teacherResult = await deleteSchoolTeachers(school.id);
  const studentResult = await convertSchoolStudentsToGeneralUsers(school.id);

  await school.ref.set(
    {
      cancellationProcessedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("School subscription cancellation processed", {
    schoolId: school.id,
    teachersDeleted: teacherResult.deleted,
    studentsConverted: studentResult.converted,
  });

  return {
    processed: true,
    schoolId: school.id,
    teachersDeleted: teacherResult.deleted,
    studentsConverted: studentResult.converted,
  };
}

export function cancellationResetFieldsForActiveBilling() {
  return { cancellationProcessedAt: FieldValue.delete() };
}
