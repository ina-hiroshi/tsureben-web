import { defineSecret } from "firebase-functions/params";

/** Resend 認証コード送信（sendVerificationCode のみで使用） */
export const resendApiKey = defineSecret("RESEND_API_KEY");

/** Stripe 課金（Checkout / Webhook / Portal） */
export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

/** Gen2 callable: localhost / 本番ホスト / ネイティブ(Capacitor) の CORS（origin はスキーム付きまたは正規表現） */
export const callableCors = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/tsureben\.web\.app$/,
  /^https:\/\/tsureben\.firebaseapp\.com$/,
  // Capacitor iOS は capacitor://localhost、Android は https://localhost を Origin に送る
  /^capacitor:\/\/localhost$/,
  /^https:\/\/localhost$/,
  /^ionic:\/\/localhost$/,
];

export const defaultCallableOptions = {
  cors: callableCors,
};

/** 認証コードメール送信が必要な Callable */
export const sendVerificationCallableOptions = {
  cors: callableCors,
  secrets: [resendApiKey],
};

/** 一括登録は Auth 操作が多く時間がかかる */
export const bulkCallableOptions = {
  cors: callableCors,
  timeoutSeconds: 300,
  memory: "512MiB",
};
