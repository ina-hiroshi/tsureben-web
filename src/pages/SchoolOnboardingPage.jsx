import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, updateProfile } from '../services/firestore/userService';
import { needsSchoolOnboarding } from '../utils/schoolOnboarding';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FilterSelect from '../components/ui/FilterSelect';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import SectionTitle from '../components/ui/SectionTitle';
import SectionHelpButton from '../components/ui/SectionHelpButton';
import Modal from '../components/ui/Modal';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { SETTINGS_SECTION_HELP } from '../content/settingsSectionHelp';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../constants/password';

const STEPS = [
  { id: 'profile', label: 'プロフィール確認' },
  { id: 'password', label: 'パスワード変更' },
  { id: 'scopes', label: '公開・連れ勉' },
];

const SHARE_SCOPE_OPTIONS = [
  { value: '学年のみ', label: '学年のみ' },
  { value: '組のみ', label: '組のみ' },
  { value: '連れ勉仲間のみ', label: '連れ勉仲間のみ' },
];

const MATE_SCOPE_OPTIONS = [
  { value: '学内のみ', label: '学内のみ' },
  { value: '学内外', label: '学内外' },
];

export default function SchoolOnboardingPage() {
  const navigate = useNavigate();
  const { email } = useAuth();
  const { toast } = useUiFeedback();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shareScope, setShareScope] = useState('学年のみ');
  const [mateScope, setMateScope] = useState('学内のみ');
  const [changingPassword, setChangingPassword] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [helpId, setHelpId] = useState(null);

  const activeHelp = helpId ? SETTINGS_SECTION_HELP[helpId] : null;

  useEffect(() => {
    if (!email) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const p = await getProfile(email);
        if (!active) return;
        if (!p || !needsSchoolOnboarding(p)) {
          navigate('/home', { replace: true });
          return;
        }
        setProfile(p);
        setShareScope(p.shareScope || '学年のみ');
        setMateScope(p.mateScope || '学内のみ');
        if (p.schoolId) {
          const schoolSnap = await getDoc(doc(db, 'schools', p.schoolId));
          if (active) {
            setSchoolName(schoolSnap.exists() ? schoolSnap.data()?.name || '' : '');
          }
        }
      } catch (err) {
        console.error('School onboarding load failed:', err);
        toast.error('プロフィールの読み込みに失敗しました');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [email, navigate, toast]);

  const profileDetails = useMemo(
    () =>
      [
        profile?.name ? { label: '表示名', value: profile.name } : null,
        { label: 'メール', value: email },
        { label: '学校名', value: schoolName || '—' },
        profile?.grade != null && profile?.class != null && profile?.number != null
          ? {
              label: '学年・組・番号',
              value: `${profile.grade}年${profile.class}組 ${profile.number}番`,
            }
          : null,
      ].filter(Boolean),
    [profile, email, schoolName]
  );

  const handlePasswordSubmit = async () => {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(PASSWORD_MIN_LENGTH_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }

    setChangingPassword(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      await updateProfile(email, { mustChangePassword: false });
      setNewPassword('');
      setConfirmPassword('');
      toast.success('パスワードを変更しました');
      setStepIndex(2);
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('セキュリティのため、一度ログアウトして再度ログインしてください');
      } else {
        toast.error(err.message || 'パスワードの変更に失敗しました');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await updateProfile(email, {
        shareScope,
        mateScope,
        onboardingComplete: true,
        mustChangePassword: false,
      });
      toast.success('初期設定が完了しました');
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(err.message || '保存に失敗しました');
    } finally {
      setFinishing(false);
    }
  };

  if (loading || !profile) {
    return <FullScreenLoader label="読み込み中…" />;
  }

  const step = STEPS[stepIndex];

  return (
    <PageLayout contentWidth="narrow" showNav={false}>
      <div className="pb-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-tsure-on-primary text-center mb-2">初期設定</h1>
        <p className="text-sm text-tsure-on-primary/80 mb-4 text-center">
          学校アカウントの初回ログインです。次の3ステップで設定を完了してください。
        </p>

        <ol className="flex items-center justify-center gap-2 mb-6" aria-label="進捗">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i <= stepIndex
                    ? 'bg-tsure-primary text-tsure-on-primary'
                    : 'bg-tsure-surface text-tsure-muted border border-tsure-border'
                }`}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`hidden sm:block w-8 h-0.5 ${
                    i < stepIndex ? 'bg-tsure-primary' : 'bg-tsure-border'
                  }`}
                />
              )}
            </li>
          ))}
        </ol>

        <Card>
          <h2 className="text-lg font-semibold text-tsure-primary mb-1">{step.label}</h2>
          <p className="text-xs text-tsure-muted mb-4">
            ステップ {stepIndex + 1} / {STEPS.length}
          </p>

          {step.id === 'profile' && (
            <>
              <p className="text-sm text-tsure-primary mb-4 leading-relaxed">
                学校管理者が登録したプロフィールを確認してください。内容に誤りがある場合は学校管理者にお問い合わせください。
              </p>
              <dl className="space-y-2 mb-6">
                {profileDetails.map(({ label, value }) => (
                  <div key={label} className="text-sm">
                    <dt className="text-tsure-muted">{label}</dt>
                    <dd className="text-tsure-primary font-medium break-all">{value}</dd>
                  </div>
                ))}
              </dl>
              <Button className="w-full" onClick={() => setStepIndex(1)}>
                内容を確認しました
              </Button>
            </>
          )}

          {step.id === 'password' && (
            <>
              <p className="text-sm text-tsure-primary mb-4 leading-relaxed">
                ログイン直後のため、新しいパスワードを設定するだけで変更できます。
              </p>
              <div className="space-y-3">
                <Input
                  type="password"
                  label="新しいパスワード"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  placeholder={`${MIN_PASSWORD_LENGTH}文字以上`}
                />
                <Input
                  type="password"
                  label="新しいパスワード（確認）"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                />
              </div>
              <p className="text-xs text-tsure-muted mt-2">{PASSWORD_MIN_LENGTH_MESSAGE}</p>
              <div className="flex flex-col gap-2 mt-4">
                <Button
                  className="w-full"
                  onClick={handlePasswordSubmit}
                  disabled={changingPassword}
                >
                  {changingPassword ? '変更中…' : 'パスワードを変更して次へ'}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setStepIndex(0)}>
                  戻る
                </Button>
              </div>
            </>
          )}

          {step.id === 'scopes' && (
            <>
              <p className="text-sm text-tsure-primary mb-4 leading-relaxed">
                アプリ内での表示範囲と、連れ勉の申請を受け付ける相手の範囲を選んでください。後から設定画面で変更できます。
              </p>
              <div className="space-y-4">
                <div>
                  <SectionTitle
                    action={
                      <SectionHelpButton
                        ariaLabel="公開範囲の説明"
                        onClick={() => setHelpId('shareScope')}
                      />
                    }
                  >
                    公開範囲
                  </SectionTitle>
                  <FilterSelect
                    value={shareScope}
                    onChange={setShareScope}
                    options={SHARE_SCOPE_OPTIONS}
                    placeholder="学年のみ"
                  />
                  <p className="text-xs text-tsure-muted mt-2">
                    一緒に勉強中の表示範囲に使われます
                  </p>
                </div>
                <div>
                  <SectionTitle
                    action={
                      <SectionHelpButton
                        ariaLabel="連れ勉の申請範囲の説明"
                        onClick={() => setHelpId('mateScope')}
                      />
                    }
                  >
                    連れ勉の申請範囲
                  </SectionTitle>
                  <FilterSelect
                    value={mateScope}
                    onChange={setMateScope}
                    options={MATE_SCOPE_OPTIONS}
                    placeholder="学内のみ"
                  />
                  <p className="text-xs text-tsure-muted mt-2">
                    招待経由で申請を受け付ける相手の範囲
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-6">
                <Button className="w-full" onClick={handleFinish} disabled={finishing}>
                  {finishing ? '保存中…' : '設定を完了する'}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setStepIndex(1)}>
                  戻る
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(activeHelp)}
        onClose={() => setHelpId(null)}
        title={activeHelp?.title || ''}
      >
        <p className="text-sm text-tsure-primary leading-relaxed whitespace-pre-line">
          {activeHelp?.body}
        </p>
        <Button className="w-full mt-6" onClick={() => setHelpId(null)}>
          閉じる
        </Button>
      </Modal>
    </PageLayout>
  );
}
