import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { assertSchoolAdmin, assertSuperAdmin, normalizeEmail } from "./authAdmin.js";
import {
  LEGACY_FREE_PLAN,
  getPlanConfig,
  resolveAppOrigin,
} from "./billingConfig.js";
import { stripeSecretKey, stripeWebhookSecret } from "./callableConfig.js";
import {
  cancellationResetFieldsForActiveBilling,
  processSchoolSubscriptionCancellation,
} from "./billingCancellation.js";

function db() {
  return getFirestore();
}

function getStripe() {
  const key = stripeSecretKey.value();
  if (!key) {
    throw new HttpsError("failed-precondition", "Stripe が設定されていません");
  }
  return new Stripe(key);
}

function mapSubscriptionStatus(subscription) {
  const status = subscription?.status;
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "unpaid") return "unpaid";
  return "unpaid";
}

export async function createCheckoutSessionHandler(_callerEmail, data = {}) {
  const planKey = String(data.plan || "").trim();
  const schoolName = String(data.schoolName || "").trim();
  const adminEmail = normalizeEmail(data.adminEmail);
  const studentEmailDomain = String(data.studentEmailDomain || "").trim();
  const appOrigin = resolveAppOrigin(data.appOrigin);

  const plan = getPlanConfig(planKey);
  if (!plan) {
    throw new HttpsError("invalid-argument", "プランが不正です");
  }
  if (!schoolName) {
    throw new HttpsError("invalid-argument", "学校名が必要です");
  }
  if (!adminEmail || !adminEmail.includes("@")) {
    throw new HttpsError("invalid-argument", "管理者メールが必要です");
  }
  if (!plan.priceId || plan.priceId.startsWith("price_REPLACE")) {
    throw new HttpsError(
      "failed-precondition",
      "Stripe Price が未設定です。npm run setup:stripe を実行してください"
    );
  }

  const stripe = getStripe();
  const subscriptionData = {
    metadata: {
      plan: plan.key,
      schoolName,
      adminEmail,
      seatLimit: String(plan.seatLimit),
      studentEmailDomain,
    },
  };
  if (plan.trialDays > 0) {
    subscriptionData.trial_period_days = plan.trialDays;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: adminEmail,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    subscription_data: subscriptionData,
    metadata: {
      plan: plan.key,
      schoolName,
      adminEmail,
      seatLimit: String(plan.seatLimit),
      studentEmailDomain,
    },
    success_url: `${appOrigin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appOrigin}/pricing`,
    locale: "ja",
    allow_promotion_codes: false,
  });

  return { url: session.url, sessionId: session.id };
}

async function ensureStripeEventOnce(eventId) {
  const ref = db().collection("stripeEvents").doc(eventId);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({
    processedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

async function upsertSchoolFromCheckout(session) {
  const metadata = session.metadata || {};
  const planKey = metadata.plan;
  const schoolName = metadata.schoolName;
  const adminEmail = normalizeEmail(metadata.adminEmail);
  const seatLimit = Number(metadata.seatLimit) || getPlanConfig(planKey)?.seatLimit || null;
  const studentEmailDomain = metadata.studentEmailDomain || "";

  if (!planKey || !schoolName || !adminEmail) {
    console.warn("checkout.session.completed: metadata incomplete", metadata);
    return;
  }

  const stripe = getStripe();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  let subscription = null;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  const settings = {};
  if (studentEmailDomain) {
    settings.studentEmailDomain = studentEmailDomain;
  }

  const billing = {
    plan: planKey,
    status: subscription ? mapSubscriptionStatus(subscription) : "active",
    seatLimit,
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscriptionId || null,
    currentPeriodEnd: subscription?.current_period_end
      ? Timestamp.fromMillis(subscription.current_period_end * 1000)
      : null,
    trialEnd: subscription?.trial_end
      ? Timestamp.fromMillis(subscription.trial_end * 1000)
      : null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const existingByCustomer = customerId
    ? await db()
        .collection("schools")
        .where("billing.stripeCustomerId", "==", customerId)
        .limit(1)
        .get()
    : null;

  let schoolRef;
  if (existingByCustomer && !existingByCustomer.empty) {
    schoolRef = existingByCustomer.docs[0].ref;
    await schoolRef.set(
      {
        name: schoolName,
        settings,
        billing,
        ...cancellationResetFieldsForActiveBilling(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    schoolRef = db().collection("schools").doc();
    await schoolRef.set({
      name: schoolName,
      settings,
      billing,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: adminEmail,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await db()
    .collection("billingInvites")
    .doc(adminEmail)
    .set(
      {
        schoolId: schoolRef.id,
        plan: planKey,
        stripeCustomerId: customerId || null,
        schoolName,
        createdAt: FieldValue.serverTimestamp(),
        claimedAt: null,
        claimedBy: null,
      },
      { merge: true }
    );
}

async function syncSchoolBillingFromSubscription(subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return;

  const snap = await db()
    .collection("schools")
    .where("billing.stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (snap.empty) return;

  const planKey =
    subscription.metadata?.plan ||
    snap.docs[0].data()?.billing?.plan ||
    "standard";

  const status = mapSubscriptionStatus(subscription);
  const patch = {
    billing: {
      plan: planKey,
      status,
      seatLimit:
        Number(subscription.metadata?.seatLimit) ||
        getPlanConfig(planKey)?.seatLimit ||
        snap.docs[0].data()?.billing?.seatLimit ||
        null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: subscription.current_period_end
        ? Timestamp.fromMillis(subscription.current_period_end * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? Timestamp.fromMillis(subscription.trial_end * 1000)
        : null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (status === "trialing" || status === "active") {
    Object.assign(patch, cancellationResetFieldsForActiveBilling());
  }
  await snap.docs[0].ref.set(patch, { merge: true });
}

export async function handleStripeWebhookRequest(req, res) {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = stripeWebhookSecret.value();

  if (!sig || !webhookSecret) {
    res.status(400).send("Webhook signature missing");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const shouldProcess = await ensureStripeEventOnce(event.id);
  if (!shouldProcess) {
    res.json({ received: true, duplicate: true });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await upsertSchoolFromCheckout(event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await syncSchoolBillingFromSubscription(event.data.object);
        break;
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await syncSchoolBillingFromSubscription({
          ...subscription,
          status: "canceled",
        });
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        if (customerId) {
          await processSchoolSubscriptionCancellation(customerId);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          const snap = await db()
            .collection("schools")
            .where("billing.stripeCustomerId", "==", customerId)
            .limit(1)
            .get();
          if (!snap.empty) {
            await snap.docs[0].ref.set(
              {
                "billing.status": "past_due",
                "billing.updatedAt": FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    res.status(500).send("Webhook handler failed");
  }
}

export async function claimBillingSchoolAdminHandler(request) {
  const email = normalizeEmail(
    request.auth?.token?.email || request.data?.email
  );
  if (!email || !request.auth?.uid) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }

  const inviteSnap = await db().collection("billingInvites").doc(email).get();
  if (!inviteSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "契約済みの管理者招待が見つかりません。Checkout 時のメールと同じ Google アカウントでログインしてください"
    );
  }

  const invite = inviteSnap.data();
  if (invite.claimedAt) {
    const teacherSnap = await db().collection("teachers").doc(email).get();
    if (teacherSnap.exists) {
      return {
        success: true,
        schoolId: invite.schoolId,
        alreadyClaimed: true,
      };
    }
  }

  const existingTeacher = await db().collection("teachers").doc(email).get();
  if (existingTeacher.exists) {
    const data = existingTeacher.data();
    if (data.schoolId && data.schoolId !== invite.schoolId) {
      throw new HttpsError(
        "failed-precondition",
        "別の学校に紐づいた教員アカウントが既に存在します"
      );
    }
  }

  await db().collection("teachers").doc(email).set(
    {
      schoolId: invite.schoolId,
      role: "school_admin",
      name: email.split("@")[0],
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: email,
    },
    { merge: true }
  );

  await inviteSnap.ref.set(
    {
      claimedAt: FieldValue.serverTimestamp(),
      claimedBy: email,
    },
    { merge: true }
  );

  return { success: true, schoolId: invite.schoolId, alreadyClaimed: false };
}

export async function createBillingPortalSessionHandler(callerEmail, { schoolId } = {}) {
  const admin = await assertSchoolAdmin(callerEmail);
  const resolvedSchoolId =
    admin.role === "super_admin" && schoolId ? schoolId : admin.schoolId;
  if (!resolvedSchoolId) {
    throw new HttpsError("failed-precondition", "学校が選択されていません");
  }
  if (admin.role !== "super_admin" && admin.schoolId !== resolvedSchoolId) {
    throw new HttpsError("permission-denied", "他校の契約は操作できません");
  }

  const schoolSnap = await db().collection("schools").doc(resolvedSchoolId).get();
  if (!schoolSnap.exists) {
    throw new HttpsError("not-found", "学校が見つかりません");
  }

  const billing = schoolSnap.data()?.billing || {};
  if (billing.plan === LEGACY_FREE_PLAN) {
    throw new HttpsError("failed-precondition", "無償提供の学校には請求ポータルはありません");
  }
  if (!billing.stripeCustomerId) {
    throw new HttpsError("failed-precondition", "Stripe 顧客 ID が未設定です");
  }

  const stripe = getStripe();
  const appOrigin = resolveAppOrigin(null);
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${appOrigin}/admin`,
  });

  return { url: session.url };
}

export async function adminListSchoolBillingHandler(callerEmail) {
  await assertSuperAdmin(callerEmail);

  const [schoolsSnap, teachersSnap] = await Promise.all([
    db().collection("schools").get(),
    db().collection("teachers").get(),
  ]);

  const teachersBySchool = new Map();
  for (const doc of teachersSnap.docs) {
    const schoolId = doc.data()?.schoolId;
    if (!schoolId) continue;
    if (!teachersBySchool.has(schoolId)) teachersBySchool.set(schoolId, []);
    teachersBySchool.get(schoolId).push({
      email: doc.id,
      name: doc.data()?.name || doc.id,
      role: doc.data()?.role || "teacher",
    });
  }

  const rows = [];
  for (const schoolDoc of schoolsSnap.docs) {
    const schoolId = schoolDoc.id;
    const data = schoolDoc.data();
    const studentsSnap = await db()
      .collection("users")
      .where("schoolId", "==", schoolId)
      .where("role", "==", "student")
      .get();

    let onboardingIncomplete = 0;
    for (const s of studentsSnap.docs) {
      if (s.data()?.onboardingComplete === false) onboardingIncomplete += 1;
    }

    const billing = data.billing || {};
    rows.push({
      schoolId,
      name: data.name || schoolId,
      settings: data.settings || {},
      billing: {
        plan: billing.plan || null,
        status: billing.status || null,
        seatLimit: billing.seatLimit ?? null,
        stripeCustomerId: billing.stripeCustomerId || null,
        stripeSubscriptionId: billing.stripeSubscriptionId || null,
        currentPeriodEnd: billing.currentPeriodEnd?.toMillis?.() || null,
        trialEnd: billing.trialEnd?.toMillis?.() || null,
      },
      studentCount: studentsSnap.size,
      teacherCount: (teachersBySchool.get(schoolId) || []).length,
      onboardingIncomplete,
      teachers: teachersBySchool.get(schoolId) || [],
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return { schools: rows };
}

export async function createLegacyFreeSchoolHandler(
  callerEmail,
  { name, settings = {} } = {}
) {
  await assertSuperAdmin(callerEmail);
  if (!name?.trim()) {
    throw new HttpsError("invalid-argument", "学校名が必要です");
  }

  const ref = db().collection("schools").doc();
  await ref.set({
    name: name.trim(),
    settings: settings || {},
    billing: {
      plan: LEGACY_FREE_PLAN,
      status: "active",
      seatLimit: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEnd: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    createdAt: FieldValue.serverTimestamp(),
    createdBy: normalizeEmail(callerEmail),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { schoolId: ref.id, name: name.trim() };
}
