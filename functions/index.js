import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  acceptMateRequestHandler,
  cancelMateRequestHandler,
  createMateInviteHandler,
  getMateInvitePreviewHandler,
  redeemMateInviteHandler,
  bulkImportStudentsHandler,
  bulkImportTeachersHandler,
  createSchoolHandler,
  createSelfRegisteredStudentHandler,
  deleteSelfRegisteredAccountHandler,
  migrateLegacyDataHandler,
  resetStudentPasswordHandler,
  resetPasswordWithCodeHandler,
  sendVerificationCodeHandler,
  verifyCodeHandler,
} from "./authAdmin.js";
import { exchangeOAuthCode } from "./oauthExchange.js";
import {
  defaultCallableOptions,
  bulkCallableOptions,
  sendVerificationCallableOptions,
} from "./callableConfig.js";

setGlobalOptions({ region: "asia-northeast1" });

function wrapCallable(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error("Callable error:", err);
      throw new HttpsError(
        "internal",
        err?.message || "サーバーで予期しないエラーが発生しました"
      );
    }
  };
}

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

function requireAuth(request) {
  if (!request.auth?.token?.email) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  return request.auth.token.email;
}

export const createSchool = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return createSchoolHandler(email, request.data || {});
  })
);

export const adminBulkImportTeachers = onCall(
  bulkCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return bulkImportTeachersHandler(email, request.data || {});
  })
);

export const adminBulkImportStudents = onCall(
  bulkCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return bulkImportStudentsHandler(email, request.data || {});
  })
);

export const adminResetStudentPassword = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return resetStudentPasswordHandler(email, request.data || {});
  })
);

export const sendVerificationCode = onCall(
  sendVerificationCallableOptions,
  wrapCallable(async (request) => {
    return sendVerificationCodeHandler(request.data || {});
  })
);

export const verifyCode = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    return verifyCodeHandler(request.data || {});
  })
);

export const createSelfRegisteredStudent = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    return createSelfRegisteredStudentHandler(request.data || {});
  })
);

export const resetPasswordWithCode = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    return resetPasswordWithCodeHandler(request.data || {});
  })
);

export const migrateLegacyData = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return migrateLegacyDataHandler(email, request.data || {});
  })
);

export const acceptMateRequest = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return acceptMateRequestHandler(email, request.data || {});
  })
);

export const createMateInvite = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return createMateInviteHandler(email, request.data || {});
  })
);

export const getMateInvitePreview = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    return getMateInvitePreviewHandler(request.auth?.token?.email, request.data || {});
  })
);

export const redeemMateInvite = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return redeemMateInviteHandler(email, request.data || {});
  })
);

export const cancelMateRequest = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return cancelMateRequestHandler(email, request.data || {});
  })
);

export const deleteSelfRegisteredAccount = onCall(
  bulkCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return deleteSelfRegisteredAccountHandler(email);
  })
);

export { exchangeOAuthCode };

export const resetActiveSessions = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Asia/Tokyo",
  },
  async () => {
    const snapshot = await db.collection("activeSessions").get();
    const batch = db.batch();
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
);
