import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AppLogo from '../components/ui/AppLogo';
import { PUBLIC_BILLING_PLANS, formatYen } from '../constants/billingPlans';
import {
  FOR_SCHOOLS_BACKGROUND,
  FOR_SCHOOLS_CORE_FEATURES,
  FOR_SCHOOLS_LOGIN_METHODS,
  FOR_SCHOOLS_CAREER_VISION,
  FOR_SCHOOLS_FEATURES,
  FOR_SCHOOLS_ONBOARDING_STEPS,
  SCHOOL_GUIDE_PDF_PATH,
} from '../content/forSchoolsFeatures';

function FeatureScreenshot({ feature }) {
  const alt = `連れ勉（TsureBen）— ${feature.title}`;
  return (
    <div className="w-full max-w-sm mx-auto md:max-w-xl">
      {feature.ipadSrc ? (
        <>
          <img
            src={feature.iphoneSrc}
            alt={alt}
            loading="lazy"
            className="w-full rounded-2xl shadow-lg border border-tsure-border md:hidden"
          />
          <img
            src={feature.ipadSrc}
            alt={alt}
            loading="lazy"
            className="w-full rounded-2xl shadow-lg border border-tsure-border hidden md:block"
          />
        </>
      ) : (
        <img
          src={feature.iphoneSrc}
          alt={alt}
          loading="lazy"
          className="w-full rounded-2xl shadow-lg border border-tsure-border"
        />
      )}
    </div>
  );
}

export default function ForSchoolsPage() {
  return (
    <div
      className="min-h-screen bg-tsure-bg pb-28"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="max-w-4xl mx-auto px-4 space-y-10">
        <header className="flex items-center justify-between gap-4 pt-4">
          <AppLogo variant="login" theme="dark" className="shrink-0" />
          <Button to="/" variant="white" size="sm" className="shrink-0">
            ログイン
          </Button>
        </header>

        <section className="text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-tsure-on-primary">
            連れ勉（TsureBen）のご紹介
          </h1>
          <p className="text-sm md:text-base text-tsure-on-primary/90 leading-relaxed max-w-2xl mx-auto">
            連れ勉仲間とともに学習する、学校向けの学習支援アプリです。
            生徒の自学習を「続く」「見える」ものにし、教員の進路指導を補助します。
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
            <a
              href={SCHOOL_GUIDE_PDF_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[0.98] bg-tsure-accent text-tsure-primary shadow-tsure-button px-6 py-3 text-lg min-h-touch"
            >
              学校向けご案内資料（PDF）を見る
            </a>
          </div>
          <p className="text-xs text-tsure-on-primary/70">
            すでにアカウントをお持ちの方は
            <Link to="/" className="underline hover:text-white ml-1">
              ログイン画面
            </Link>
            からお入りください。
          </p>
        </section>

        <Card>
          <h2 className="text-lg font-bold text-tsure-primary mb-2">開発の背景</h2>
          <p className="text-sm text-tsure-primary leading-relaxed mb-4">
            {FOR_SCHOOLS_BACKGROUND.lead}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {FOR_SCHOOLS_BACKGROUND.challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="rounded-xl border border-[#c4b5a0] bg-white p-4"
              >
                <p className="text-xs font-semibold text-tsure-muted">{challenge.side}</p>
                <h3 className="font-bold text-tsure-primary mt-1 mb-2">{challenge.heading}</h3>
                <ul className="space-y-1 text-sm text-tsure-primary list-disc pl-5">
                  {challenge.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-tsure-primary mb-4">TsureBen の 3 つの機能</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FOR_SCHOOLS_CORE_FEATURES.map((feature) => (
              <div
                key={feature.id}
                className="rounded-xl border border-[#c4b5a0] bg-white p-4 flex flex-col"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tsure-primary text-tsure-on-primary text-sm font-bold"
                    aria-hidden
                  >
                    {feature.badge}
                  </span>
                  <span className="text-xs font-semibold text-tsure-muted">
                    【{feature.category}】
                  </span>
                </div>
                <h3 className="font-bold text-tsure-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-tsure-primary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-tsure-primary mb-4">ログイン方法</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {FOR_SCHOOLS_LOGIN_METHODS.map((method) => (
              <div
                key={method.id}
                className="rounded-xl border border-[#c4b5a0] bg-white p-4"
              >
                <h3 className="font-bold text-tsure-primary mb-2">{method.role}ログイン</h3>
                <ul className="space-y-2 text-sm text-tsure-primary list-disc pl-5">
                  {method.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-tsure-muted mt-4">
            学校配布アカウントおよび Web 版では広告を表示しません（自己登録の iOS アプリのみ広告あり）。
          </p>
        </Card>

        <section className="space-y-12">
          <h2 className="text-xl font-bold text-tsure-on-primary text-center">
            画面でみる主な機能
          </h2>
          {FOR_SCHOOLS_FEATURES.map((feature, index) => {
            const reversed = index % 2 === 1;
            return (
              <div
                key={feature.id}
                className={`flex flex-col gap-6 md:gap-10 md:items-center ${
                  reversed ? 'md:flex-row-reverse' : 'md:flex-row'
                }`}
              >
                <div className="md:flex-1 space-y-3">
                  <h3 className="text-lg font-bold text-tsure-on-primary">{feature.title}</h3>
                  <p className="text-sm text-tsure-on-primary/90 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <div className="md:flex-1 md:shrink-0">
                  <FeatureScreenshot feature={feature} />
                </div>
              </div>
            );
          })}
        </section>

        <Card>
          <h2 className="text-lg font-bold text-tsure-primary mb-4">導入の流れ</h2>
          <ol className="space-y-4">
            {FOR_SCHOOLS_ONBOARDING_STEPS.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tsure-primary text-tsure-on-primary text-sm font-bold"
                  aria-hidden
                >
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold text-tsure-primary">{item.title}</h3>
                  <p className="text-sm text-tsure-muted mt-1">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-tsure-primary mb-4">進路指導への展望</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {FOR_SCHOOLS_CAREER_VISION.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#c4b5a0] bg-white p-4"
              >
                <h3 className="font-bold text-tsure-primary mb-2">{item.title}</h3>
                <p className="text-sm text-tsure-primary leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-tsure-primary mb-2">学校向けプラン（概要）</h2>
          <p className="text-sm text-tsure-muted mb-6">
            年額サブスクリプション（税込）。詳細の申込は料金ページから行えます。
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {PUBLIC_BILLING_PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`rounded-xl border p-4 ${
                  plan.recommended
                    ? 'border-tsure-primary bg-[#f5ebe0] ring-2 ring-tsure-primary/30'
                    : 'border-[#c4b5a0] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-bold text-tsure-primary">{plan.label}</h3>
                  {plan.recommended && (
                    <span className="text-xs bg-tsure-primary text-white px-2 py-0.5 rounded-full">
                      おすすめ
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-tsure-primary">{formatYen(plan.amountYen)}</p>
                <p className="text-xs text-tsure-muted">/ 年（税込）</p>
                <p className="text-sm mt-2">生徒 {plan.seatLimit} 名まで</p>
                {plan.trialDays > 0 && (
                  <p className="text-sm text-green-700 mt-1 font-medium">
                    {plan.trialDays} 日間無料トライアル
                  </p>
                )}
                <p className="text-xs text-gray-600 mt-2">{plan.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button to="/pricing" size="lg" className="w-full md:w-auto">
              プランを選んで申し込む
            </Button>
          </div>
        </Card>

        <p className="text-center text-sm text-tsure-on-primary/80 space-x-4 pb-4">
          <a
            href={SCHOOL_GUIDE_PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            ご案内資料（PDF）
          </a>
          <Link to="/" className="underline hover:text-white">
            ログイン画面へ
          </Link>
          <Link to="/privacy" className="underline hover:text-white">
            プライバシーポリシー
          </Link>
        </p>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-tsure-border bg-tsure-bg/95 backdrop-blur px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, var(--safe-bottom))' }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-2 sm:justify-center">
          <Button to="/pricing" className="w-full sm:w-auto flex-1 sm:flex-none">
            プランを選んで申し込む
          </Button>
          <Button to="/" variant="white" className="w-full sm:w-auto">
            ログイン
          </Button>
        </div>
      </div>
    </div>
  );
}
