export const PUBLIC_BILLING_PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    amountYen: 120_000,
    seatLimit: 200,
    trialDays: 90,
    description: '学年単位・試験導入向け',
  },
  {
    key: 'standard',
    label: 'Standard',
    amountYen: 240_000,
    seatLimit: 500,
    trialDays: 0,
    description: '私立高校の標準導入向け',
    recommended: true,
  },
  {
    key: 'campus',
    label: 'Campus',
    amountYen: 480_000,
    seatLimit: 1200,
    trialDays: 0,
    description: '大規模校・中高一貫向け',
  },
];

export function formatYen(amount) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const BILLING_STATUS_LABELS = {
  trialing: 'トライアル中',
  active: '有効',
  past_due: '支払い遅延',
  canceled: '解約済み',
  unpaid: '未払い',
};

export const BILLING_PLAN_LABELS = {
  starter: 'Starter',
  standard: 'Standard',
  campus: 'Campus',
  legacy_free: '無償（恒久）',
};
