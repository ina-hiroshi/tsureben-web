import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { getMateInvitePreview } from '../services/authApi';
import { submitMateInviteRequest } from '../services/firestore/mateService';
import { setPostLoginReturnUrl } from '../utils/postLoginRedirect';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function MateInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { email, loading: authLoading } = useAuth();
  const { toast } = useUiFeedback();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    getMateInvitePreview({ token })
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((err) => {
        if (active) {
          setPreview({ invalid: true, expired: false, error: err.message });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!preview?.expiresAt || preview.expired) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [preview?.expiresAt, preview?.expired]);

  const remainingMs = useMemo(() => {
    if (!preview?.expiresAt) return 0;
    return Math.max(0, preview.expiresAt - now);
  }, [preview?.expiresAt, now]);

  const isExpired = preview?.expired || remainingMs <= 0;

  const handleLogin = () => {
    setPostLoginReturnUrl(`/mate-invite/${token}`);
    navigate('/');
  };

  const handleSubmit = async () => {
    if (!token || isExpired) return;
    setSubmitting(true);
    try {
      const result = await submitMateInviteRequest(token);
      if (result.status === 'already_mates') {
        toast.success('既に連れ勉仲間です');
      } else if (result.status === 'already_pending') {
        toast.success('既に申請済みです');
      } else {
        toast.success('申請を送信しました');
      }
      navigate('/turebenmate');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <PageLayout title="連れ勉の招待">
        <Card>
          <p className="text-sm text-tsure-muted">読み込み中...</p>
        </Card>
      </PageLayout>
    );
  }

  if (!preview || preview.invalid) {
    return (
      <PageLayout title="連れ勉の招待">
        <Card className="space-y-4">
          <p className="text-tsure-primary">招待が見つかりません。</p>
          <Button onClick={() => navigate(email ? '/turebenmate' : '/')}>
            {email ? '連れ勉ページへ' : 'ログイン画面へ'}
          </Button>
        </Card>
      </PageLayout>
    );
  }

  const gradeClass =
    preview.inviterGrade && preview.inviterClass
      ? `${preview.inviterGrade} ${preview.inviterClass}組`
      : preview.inviterGrade || null;

  return (
    <PageLayout title="連れ勉の招待">
      <Card className="space-y-4">
        <div>
          <p className="text-sm text-tsure-muted">招待者</p>
          <p className="text-xl font-semibold text-tsure-primary">{preview.inviterName}</p>
          {gradeClass && <p className="text-sm text-tsure-muted mt-1">{gradeClass}</p>}
        </div>

        <div>
          <p className="text-sm text-tsure-muted">有効期限</p>
          <p className={`text-lg font-medium ${isExpired ? 'text-red-600' : 'text-tsure-primary'}`}>
            {isExpired ? '期限切れ' : `残り ${formatRemaining(remainingMs)}`}
          </p>
        </div>

        {isExpired ? (
          <p className="text-sm text-tsure-muted">
            招待の有効期限が切れています。招待者に新しいQRコードまたはリンクを発行してもらってください。
          </p>
        ) : !email ? (
          <div className="space-y-3">
            <p className="text-sm text-tsure-muted">申請するにはログインが必要です。</p>
            <Button onClick={handleLogin} className="w-full">
              ログインして申請
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-tsure-muted">
              {preview.inviterName} さんに連れ勉申請を送ります。相手の承認後に連れ勉仲間になります。
            </p>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? '送信中...' : '申請する'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/turebenmate')}
              className="w-full"
            >
              キャンセル
            </Button>
          </div>
        )}
      </Card>
    </PageLayout>
  );
}
