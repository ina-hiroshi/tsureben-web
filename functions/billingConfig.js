/**
 * Stripe Price ID は `npm run setup:stripe` で自動更新されます。
 * 手動編集する場合は Stripe Dashboard の Price ID と一致させてください。
 */
export const STRIPE_PRODUCT_METADATA_KEY = "tsureben_product";
export const STRIPE_PRODUCT_METADATA_VALUE = "school_saas";

export const BILLING_PLANS = {
  starter: {
    key: "starter",
    label: "Starter",
    amountYen: 120_000,
    seatLimit: 200,
    trialDays: 90,
    priceId: "price_1TemF6BIQuritG7Qisry4zeF",
  },
  standard: {
    key: "standard",
    label: "Standard",
    amountYen: 240_000,
    seatLimit: 500,
    trialDays: 0,
    priceId: "price_1TemF6BIQuritG7QoVm9XBHv",
  },
  campus: {
    key: "campus",
    label: "Campus",
    amountYen: 480_000,
    seatLimit: 1200,
    trialDays: 0,
    priceId: "price_1TemF7BIQuritG7QQKDr1E07",
  },
};

export const LEGACY_FREE_PLAN = "legacy_free";

export const ACTIVE_BILLING_STATUSES = new Set(["trialing", "active"]);
export const STUDENT_WRITE_BILLING_STATUSES = new Set(["trialing", "active"]);
export const TEACHER_WRITE_BILLING_STATUSES = new Set(["trialing", "active", "past_due"]);

export function getPlanConfig(planKey) {
  return BILLING_PLANS[planKey] || null;
}

export function resolveAppOrigin(origin) {
  const fallback = "https://tsureben.web.app";
  if (!origin || typeof origin !== "string") return fallback;
  const trimmed = origin.trim().replace(/\/$/, "");
  const allowed =
    /^http:\/\/localhost(:\d+)?$/.test(trimmed) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(trimmed) ||
    trimmed === "https://tsureben.web.app" ||
    trimmed === "https://tsureben.firebaseapp.com";
  return allowed ? trimmed : fallback;
}
