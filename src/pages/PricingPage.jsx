import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AppLogo from '../components/ui/AppLogo';
import { createCheckoutSession } from '../services/billingApi';
import { PUBLIC_BILLING_PLANS, formatYen } from '../constants/billingPlans';

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [schoolName, setSchoolName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [studentEmailDomain, setStudentEmailDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!schoolName.trim() || !adminEmail.trim()) {
      setError('学校名と管理者メールを入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await createCheckoutSession({
        plan: selectedPlan,
        schoolName: schoolName.trim(),
        adminEmail: adminEmail.trim(),
        studentEmailDomain: studentEmailDomain.trim(),
        appOrigin: window.location.origin,
      });
      if (!url) throw new Error('Checkout URL を取得できませんでした');
      window.location.href = url;
    } catch (err) {
      setError(err.message || '申込の開始に失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-dvh bg-tsure-bg p-4"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-center pt-4">
          <AppLogo variant="login" theme="dark" />
        </div>

        <Card>
          <h1 className="text-xl font-bold text-tsure-primary mb-2">学校向けプラン</h1>
          <p className="text-sm text-tsure-muted mb-6">
            年額サブスクリプション（税込）。申込後、同じメールの Google アカウントで管理者ログインし、生徒・教員を一括登録できます。
          </p>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {PUBLIC_BILLING_PLANS.map((plan) => (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlan(plan.key)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  selectedPlan === plan.key
                    ? 'border-tsure-primary bg-[#f5ebe0] ring-2 ring-tsure-primary/30'
                    : 'border-[#c4b5a0] bg-white hover:border-tsure-primary/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="font-bold text-tsure-primary">{plan.label}</h2>
                  {plan.recommended && (
                    <span className="text-xs bg-tsure-primary text-white px-2 py-0.5 rounded-full">
                      おすすめ
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-tsure-primary">{formatYen(plan.amountYen)}</p>
                <p className="text-xs text-tsure-muted mt-1">/ 年（税込）</p>
                <p className="text-sm mt-3">生徒 {plan.seatLimit} 名まで</p>
                {plan.trialDays > 0 && (
                  <p className="text-sm text-green-700 mt-1 font-medium">
                    {plan.trialDays} 日間無料トライアル
                  </p>
                )}
                <p className="text-xs text-gray-600 mt-2">{plan.description}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-tsure-primary">お申し込み情報</h3>
            <div>
              <label className="block text-sm font-medium mb-1">学校名</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full border border-[#c4b5a0] rounded-lg px-3 py-2"
                placeholder="○○高等学校"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">管理者メール（Google ログイン用）</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full border border-[#c4b5a0] rounded-lg px-3 py-2"
                placeholder="admin@example.ed.jp"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Checkout と同じアドレスで、完了後に Google 教員ログインしてください。
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">生徒メールドメイン（任意）</label>
              <input
                type="text"
                value={studentEmailDomain}
                onChange={(e) => setStudentEmailDomain(e.target.value)}
                className="w-full border border-[#c4b5a0] rounded-lg px-3 py-2"
                placeholder="@st.example.ed.jp"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Stripe へ移動中...' : 'カード登録して申し込む'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm space-x-4">
          <Link to="/for-schools" className="text-tsure-on-primary underline hover:text-white">
            機能紹介へ戻る
          </Link>
          <Link to="/" className="text-tsure-on-primary underline hover:text-white">
            ログイン画面へ戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
