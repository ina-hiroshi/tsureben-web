import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  LEGACY_FREE_PLAN,
  STUDENT_WRITE_BILLING_STATUSES,
  TEACHER_WRITE_BILLING_STATUSES,
} from "./billingConfig.js";

function db() {
  return getFirestore();
}

export async function getSchoolBilling(schoolId) {
  if (!schoolId) return null;
  const snap = await db().collection("schools").doc(schoolId).get();
  if (!snap.exists) return null;
  return snap.data()?.billing || null;
}

async function countSchoolStudents(schoolId) {
  const snap = await db()
    .collection("users")
    .where("schoolId", "==", schoolId)
    .where("role", "==", "student")
    .get();
  return snap.size;
}

export async function assertSchoolBillingAllowsWrite(
  schoolId,
  { newStudents = 0, allowTeacherImport = false } = {}
) {
  const billing = await getSchoolBilling(schoolId);
  if (!billing) {
    throw new HttpsError("failed-precondition", "学校の課金情報が見つかりません");
  }

  if (billing.plan === LEGACY_FREE_PLAN) {
    return billing;
  }

  const status = billing.status || "unpaid";
  const allowedStatuses = allowTeacherImport
    ? TEACHER_WRITE_BILLING_STATUSES
    : STUDENT_WRITE_BILLING_STATUSES;

  if (!allowedStatuses.has(status)) {
    const label = allowTeacherImport ? "教員の一括登録" : "生徒の一括登録";
    throw new HttpsError(
      "failed-precondition",
      `契約状態（${status}）のため${label}はできません。契約・請求をご確認ください。`
    );
  }

  if (!allowTeacherImport && billing.seatLimit != null && newStudents > 0) {
    const current = await countSchoolStudents(schoolId);
    if (current + newStudents > billing.seatLimit) {
      throw new HttpsError(
        "failed-precondition",
        `生徒数の上限（${billing.seatLimit}名）を超えるため登録できません（現在 ${current} 名）`
      );
    }
  }

  return billing;
}
