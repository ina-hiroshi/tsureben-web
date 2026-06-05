#!/usr/bin/env node
/**
 * Stripe Product / Price を作成し functions/billingConfig.js の priceId を更新します。
 *
 * 使い方:
 *   STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe
 *
 * ローカル Webhook 検証:
 *   stripe listen --forward-to https://asia-northeast1-<PROJECT>.cloudfunctions.net/stripeWebhook
 *
 * 本番:
 *   STRIPE_SECRET_KEY=sk_live_... npm run setup:stripe
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import {
  STRIPE_PRODUCT_METADATA_KEY,
  STRIPE_PRODUCT_METADATA_VALUE,
  BILLING_PLANS,
} from "../functions/billingConfig.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const billingConfigPath = join(__dirname, "../functions/billingConfig.js");

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY が未設定です。");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

async function findOrCreateProduct() {
  const products = await stripe.products.list({ limit: 100, active: true });
  const existing = products.data.find(
    (p) =>
      p.metadata?.[STRIPE_PRODUCT_METADATA_KEY] === STRIPE_PRODUCT_METADATA_VALUE ||
      p.name === "TsureBen School"
  );
  if (existing) {
    console.log(`既存 Product を使用: ${existing.id} (${existing.name})`);
    return existing;
  }
  const created = await stripe.products.create({
    name: "TsureBen School",
    description: "連れ勉 学校向け SaaS（年額サブスクリプション）",
    metadata: {
      [STRIPE_PRODUCT_METADATA_KEY]: STRIPE_PRODUCT_METADATA_VALUE,
    },
  });
  console.log(`Product を作成: ${created.id}`);
  return created;
}

async function findOrCreatePrice(productId, plan) {
  const prices = await stripe.prices.list({ product: productId, limit: 100, active: true });
  const existing = prices.data.find(
    (p) =>
      p.metadata?.plan_key === plan.key &&
      p.unit_amount === plan.amountYen &&
      p.currency === "jpy" &&
      p.recurring?.interval === "year"
  );
  if (existing) {
    console.log(`  既存 Price [${plan.key}]: ${existing.id}`);
    return existing;
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "jpy",
    unit_amount: plan.amountYen,
    tax_behavior: "inclusive",
    recurring: { interval: "year" },
    metadata: {
      plan_key: plan.key,
      seat_limit: String(plan.seatLimit),
      trial_days: String(plan.trialDays || 0),
    },
  });
  console.log(`  Price を作成 [${plan.key}]: ${created.id}`);
  return created;
}

function updateBillingConfig(priceIds) {
  let source = readFileSync(billingConfigPath, "utf8");
  for (const [key, priceId] of Object.entries(priceIds)) {
    const placeholder = `price_REPLACE_${key.toUpperCase()}`;
    if (!source.includes(placeholder) && !source.includes(priceId)) {
      const re = new RegExp(`(${key}:[\\s\\S]*?priceId:\\s*")([^"]+)(")`, "m");
      if (re.test(source)) {
        source = source.replace(re, `$1${priceId}$3`);
        continue;
      }
    }
    source = source.replaceAll(placeholder, priceId);
  }
  writeFileSync(billingConfigPath, source, "utf8");
  console.log(`\n更新しました: ${billingConfigPath}`);
}

async function main() {
  const product = await findOrCreateProduct();
  const priceIds = {};
  for (const plan of Object.values(BILLING_PLANS)) {
    const price = await findOrCreatePrice(product.id, plan);
    priceIds[plan.key] = price.id;
  }
  updateBillingConfig(priceIds);
  console.log("\nPrice ID 一覧:");
  for (const [key, id] of Object.entries(priceIds)) {
    console.log(`  ${key}: ${id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
