import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  bulkImportStudentsHandler,
  bulkImportTeachersHandler,
  createSchoolHandler,
  createSelfRegisteredStudentHandler,
  migrateLegacyDataHandler,
  resetStudentPasswordHandler,
  sendVerificationCodeHandler,
  verifyCodeHandler,
} from "./authAdmin.js";
import { exchangeOAuthCode } from "./oauthExchange.js";
import { defaultCallableOptions, bulkCallableOptions } from "./callableConfig.js";

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
  defaultCallableOptions,
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

export const migrateLegacyData = onCall(
  defaultCallableOptions,
  wrapCallable(async (request) => {
    const email = requireAuth(request);
    return migrateLegacyDataHandler(email, request.data || {});
  })
);

export { exchangeOAuthCode };

export const generateScatterChartData = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Asia/Tokyo",
  },
  async () => {
    const usersSnap = await db.collection("users").get();
    const logsSnap = await db.collection("studyPomodoroLogs").get();

    const oneDayAgo = new Date();
    const oneWeekAgo = new Date();
    const oneMonthAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const toDate = (str) => new Date(str);
    const results = { yesterday: {}, week: {}, month: {} };
    const userMap = {};

    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const userEmail = docSnap.id;
      const scores = data.scores || [];
      const april = scores.find((s) => s.testName === "4月河合塾全統共テ模試");
      const may = scores.find((s) => s.testName === "5月河合記述模試");
      const score = may?.value || april?.value;
      if (!score) return;
      userMap[userEmail] = score;
    });

    logsSnap.forEach((docSnap) => {
      const userEmail = docSnap.id;
      const score = userMap[userEmail];
      if (!score) return;

      const logData = docSnap.data();
      let minsYesterday = 0;
      let minsWeek = 0;
      let minsMonth = 0;

      for (const dateStr in logData) {
        const date = toDate(dateStr);
        const entries = logData[dateStr];
        if (!Array.isArray(entries)) continue;

        const total = entries.reduce((sum, log) => sum + (log.duration || 0), 0);
        if (date >= oneMonthAgo) minsMonth += total;
        if (date >= oneWeekAgo) minsWeek += total;
        if (date >= oneDayAgo) minsYesterday += total;
      }

      if (minsYesterday > 0) results.yesterday[userEmail] = { totalMinutes: minsYesterday, score };
      if (minsWeek > 0) results.week[userEmail] = { totalMinutes: minsWeek, score };
      if (minsMonth > 0) results.month[userEmail] = { totalMinutes: minsMonth, score };
    });

    await db.collection("scatterChartData_summary").doc("yesterday").set(results.yesterday);
    await db.collection("scatterChartData_summary").doc("week").set(results.week);
    await db.collection("scatterChartData_summary").doc("month").set(results.month);
  }
);

export const resetActivePomodoroUsers = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Asia/Tokyo",
  },
  async () => {
    const snapshot = await db.collection("activePomodoroUsers").get();
    const batch = db.batch();
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
);
