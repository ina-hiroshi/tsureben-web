import { useCallback, useEffect, useState } from 'react';
import { adminListSchoolBilling } from '../../services/billingApi';
import { BILLING_PLAN_LABELS, BILLING_STATUS_LABELS } from '../../constants/billingPlans';
import LoadingOverlay from '../ui/LoadingOverlay';
import { useUiFeedback } from '../../contexts/UiFeedbackContext';

function formatTimestamp(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function seatUsage(studentCount, seatLimit) {
  if (seatLimit == null) return `${studentCount} 名`;
  return `${studentCount} / ${seatLimit} 名`;
}

export default function SchoolBillingOverviewPanel({ onSelectSchool }) {
  const { toast } = useUiFeedback();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListSchoolBilling();
      setSchools(data.schools || []);
    } catch (err) {
      toast.error(err.message || '課金一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <LoadingOverlay open={loading} label="学校一覧を読み込んでいます..." />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-700">全学校の契約プラン・登録状況です。</p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg border border-[#c4b5a0] hover:bg-white disabled:opacity-50"
        >
          更新
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#c4b5a0]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f5ebe0] text-left">
            <tr>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">学校名</th>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">プラン</th>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">状態</th>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">生徒</th>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">教員</th>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">トライアル終了</th>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">次回更新</th>
              <th className="px-3 py-2 font-semibold text-[#5a3e28]">Stripe</th>
            </tr>
          </thead>
          <tbody>
            {schools.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  学校が登録されていません
                </td>
              </tr>
            )}
            {schools.map((school) => {
              const plan = school.billing?.plan;
              const status = school.billing?.status;
              const stripeCustomerId = school.billing?.stripeCustomerId;
              return (
                <tr
                  key={school.schoolId}
                  className="border-t border-[#e8dfd0] hover:bg-white/60 cursor-pointer"
                  onClick={() => onSelectSchool?.(school.schoolId)}
                >
                  <td className="px-3 py-2 font-medium text-[#5a3e28]">{school.name}</td>
                  <td className="px-3 py-2">{BILLING_PLAN_LABELS[plan] || plan || '—'}</td>
                  <td className="px-3 py-2">{BILLING_STATUS_LABELS[status] || status || '—'}</td>
                  <td className="px-3 py-2">
                    {seatUsage(school.studentCount, school.billing?.seatLimit)}
                    {school.onboardingIncomplete > 0 && (
                      <span className="block text-xs text-amber-700">
                        初回設定未完了 {school.onboardingIncomplete}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{school.teacherCount} 名</td>
                  <td className="px-3 py-2">{formatTimestamp(school.billing?.trialEnd)}</td>
                  <td className="px-3 py-2">{formatTimestamp(school.billing?.currentPeriodEnd)}</td>
                  <td className="px-3 py-2">
                    {stripeCustomerId ? (
                      <a
                        href={`https://dashboard.stripe.com/customers/${stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5a3e28] underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        顧客
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {schools.some((s) => s.teachers?.length) && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[#5a3e28] font-medium">
            教員一覧（学校別）
          </summary>
          <div className="mt-3 space-y-3">
            {schools.map((school) =>
              school.teachers?.length ? (
                <div key={`teachers-${school.schoolId}`} className="border rounded-lg p-3 bg-white/50">
                  <p className="font-semibold text-[#5a3e28] mb-1">{school.name}</p>
                  <ul className="text-xs space-y-1 text-gray-700">
                    {school.teachers.map((t) => (
                      <li key={t.email}>
                        {t.name}（{t.role}）— {t.email}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </details>
      )}
    </div>
  );
}
