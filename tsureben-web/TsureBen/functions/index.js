import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

setGlobalOptions({ region: "asia-northeast1" }); // 東京リージョンに変更する場合

initializeApp();
const db = getFirestore();

export const generateScatterChartData = onSchedule(
    {
        schedule: "0 0 * * *", // 毎日0時
        timeZone: "Asia/Tokyo",
    },
    async (event) => {
        const usersSnap = await db.collection("users").get();
        const logsSnap = await db.collection("studyPomodoroLogs").get();

        const oneDayAgo = new Date();
        const oneWeekAgo = new Date();
        const oneMonthAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const toDate = str => new Date(str);
        const results = { yesterday: {}, week: {}, month: {} };
        const userMap = {};

        usersSnap.forEach(doc => {
            const data = doc.data();
            const email = doc.id;

            const scores = data.scores || [];
            const april = scores.find(s => s.testName === "4月河合塾全統共テ模試");
            const may = scores.find(s => s.testName === "5月河合記述模試");
            const score = may?.value || april?.value;
            if (!score) return;

            userMap[email] = score;
        });

        logsSnap.forEach(doc => {
            const email = doc.id;
            const score = userMap[email];
            if (!score) return;

            const logData = doc.data();
            let minsYesterday = 0, minsWeek = 0, minsMonth = 0;

            for (const dateStr in logData) {
                const date = toDate(dateStr);
                const entries = logData[dateStr];
                if (!Array.isArray(entries)) continue;

                const total = entries.reduce((sum, log) => sum + (log.duration || 0), 0);
                if (date >= oneMonthAgo) minsMonth += total;
                if (date >= oneWeekAgo) minsWeek += total;
                if (date >= oneDayAgo) minsYesterday += total;
            }

            if (minsYesterday > 0) results.yesterday[email] = { totalMinutes: minsYesterday, score };
            if (minsWeek > 0) results.week[email] = { totalMinutes: minsWeek, score };
            if (minsMonth > 0) results.month[email] = { totalMinutes: minsMonth, score };
        });

        await db.collection("scatterChartData_summary").doc("yesterday").set(results.yesterday);
        await db.collection("scatterChartData_summary").doc("week").set(results.week);
        await db.collection("scatterChartData_summary").doc("month").set(results.month);
    }
);