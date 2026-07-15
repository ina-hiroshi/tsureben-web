import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useStudentProfile } from '../contexts/StudentProfileContext';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { getProfile, updateProfile } from '../services/firestore/userService';
import {
  deleteSelfRegisteredAccount,
  createAccountTransferCode,
  redeemAccountTransfer,
  getPendingSchoolJoin,
  acceptSchoolJoin,
} from '../services/authApi';
import { logout } from '../utils/authSession';
import { reauthenticateWithApple, isAppleLoginCancelled } from '../utils/appleAuth';
import {
  canDeleteSelfRegisteredAccount,
  canEditSelfRegisteredDisplayName,
} from '../utils/accountDeletion';
import SubjectCatalogPanel from '../components/settings/SubjectCatalogPanel';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import FilterSelect from '../components/ui/FilterSelect';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import SectionHelpButton from '../components/ui/SectionHelpButton';
import Modal from '../components/ui/Modal';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { isIOSNative } from '../utils/platformAccess';
import { setReviewPromptBlocked } from '../services/inAppReviewService';
import {
  DEFAULT_PLAN_NOTIFY_LEAD_MINUTES,
  PLAN_NOTIFY_LEAD_OPTIONS,
  requestPlanNotificationPermission,
  syncPlanNotifications,
} from '../services/planNotificationService';
import { SETTINGS_SECTION_HELP } from '../content/settingsSectionHelp';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../constants/password';

const SHARE_SCOPE_OPTIONS = [
  { value: '学年のみ', label: '学年のみ' },
  { value: '組のみ', label: '組のみ' },
  { value: '連れ勉仲間のみ', label: '連れ勉仲間のみ' },
];

const MATE_SCOPE_OPTIONS = [
  { value: '学内のみ', label: '学内のみ' },
  { value: '学内外', label: '学内外' },
];

const PLAN_NOTIFY_LEAD_SELECT_OPTIONS = PLAN_NOTIFY_LEAD_OPTIONS.map((minutes) => ({
  value: String(minutes),
  label: minutes === 0 ? '開始ちょうど' : `${minutes}分前`,
}));

const DELETE_CONFIRM_PHRASE = '削除する';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { email } = useAuth();
  const { refreshProfile } = useStudentProfile();
  const { isTeacher, schoolId: teacherSchoolId } = useTeacherStatus();
  const { toast, confirm } = useUiFeedback();
  const [profile, setProfile] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [name, setName] = useState('');
  const [shareScope, setShareScope] = useState('学年のみ');
  const [mateScope, setMateScope] = useState('学内のみ');
  const [planNotifyEnabled, setPlanNotifyEnabled] = useState(false);
  const [planNotifyLeadMinutes, setPlanNotifyLeadMinutes] = useState(
    DEFAULT_PLAN_NOTIFY_LEAD_MINUTES
  );
  const [savingPlanNotify, setSavingPlanNotify] = useState(false);
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [helpId, setHelpId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [schoolPlan, setSchoolPlan] = useState(null);
  const [transferCode, setTransferCode] = useState(null);
  const [transferExpiresAt, setTransferExpiresAt] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(null);
  const [acceptingJoin, setAcceptingJoin] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importingTransfer, setImportingTransfer] = useState(false);

  const isPasswordUser =
    auth.currentUser?.providerData?.some((p) => p.providerId === 'password') ?? false;
  const isAppleUser =
    auth.currentUser?.providerData?.some((p) => p.providerId === 'apple.com') ?? false;
  const canEditDisplayName = !isTeacher && canEditSelfRegisteredDisplayName(profile);
  const canChangePassword = isPasswordUser && !isTeacher;
  const canDeleteAccount = !isTeacher && canDeleteSelfRegisteredAccount(profile);
  const isSchoolProvisionedStudent =
    !isTeacher && profile && !canDeleteSelfRegisteredAccount(profile);
  const showMandatoryPasswordChange =
    mustChangePassword && canChangePassword && !isSchoolProvisionedStudent;
  const isLegacyFreeSchool = schoolPlan === 'legacy_free';
  const canImportTransfer = isSchoolProvisionedStudent && !isLegacyFreeSchool;
  const activeHelp = helpId ? SETTINGS_SECTION_HELP[helpId] : null;
  const showPlanNotificationSettings = isIOSNative() && !isTeacher;

  useEffect(() => {
    if (!email) return;
    getProfile(email).then(async (p) => {
      if (!p) return;
      setProfile(p);
      setName(p.name || '');
      setShareScope(p.shareScope || '学年のみ');
      setMateScope(p.mateScope || '学内のみ');
      setPlanNotifyEnabled(p.planNotifyEnabled === true);
      setPlanNotifyLeadMinutes(
        PLAN_NOTIFY_LEAD_OPTIONS.includes(p.planNotifyLeadMinutes)
          ? p.planNotifyLeadMinutes
          : DEFAULT_PLAN_NOTIFY_LEAD_MINUTES
      );
      setSubjectCatalog(p.subjectCatalog || {});
      setMustChangePassword(p.mustChangePassword === true);
      const schoolId = p.schoolId || teacherSchoolId;
      if (schoolId) {
        const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
        const schoolData = schoolSnap.exists() ? schoolSnap.data() : null;
        setSchoolName(schoolData?.name || '');
        setSchoolPlan(schoolData?.billing?.plan ?? null);
      } else {
        setSchoolName('');
        setSchoolPlan(null);
      }
    });
  }, [email, teacherSchoolId]);

  useEffect(() => {
    if (!email || isTeacher || !profile) return;
    if (!canDeleteSelfRegisteredAccount(profile)) {
      setPendingJoin(null);
      return;
    }
    getPendingSchoolJoin()
      .then((res) => setPendingJoin(res?.invite ?? null))
      .catch(() => setPendingJoin(null));
  }, [email, isTeacher, profile]);

  useEffect(() => {
    if (!isIOSNative()) return undefined;
    setReviewPromptBlocked(deleteModalOpen);
    return () => setReviewPromptBlocked(false);
  }, [deleteModalOpen]);

  const saveShareScope = async (value) => {
    setShareScope(value);
    await updateProfile(email, { shareScope: value });
    toast.success('保存しました');
  };

  const saveMateScope = async (value) => {
    setMateScope(value);
    await updateProfile(email, { mateScope: value });
    toast.success('保存しました');
  };

  const persistPlanNotificationPrefs = async (nextEnabled, nextLeadMinutes) => {
    await updateProfile(email, {
      planNotifyEnabled: nextEnabled,
      planNotifyLeadMinutes: nextLeadMinutes,
    });
    await syncPlanNotifications(email, {
      enabled: nextEnabled,
      leadMinutes: nextLeadMinutes,
    });
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            planNotifyEnabled: nextEnabled,
            planNotifyLeadMinutes: nextLeadMinutes,
          }
        : prev
    );
    toast.success('保存しました');
  };

  const handlePlanNotifyToggle = async (event) => {
    const nextEnabled = event.target.checked;
    if (!email || savingPlanNotify) {
      event.preventDefault();
      return;
    }

    setSavingPlanNotify(true);
    try {
      if (nextEnabled) {
        const granted = await requestPlanNotificationPermission();
        if (!granted) {
          event.target.checked = false;
          toast.warning('通知を許可してください。設定アプリから変更できます。');
          return;
        }
        setPlanNotifyEnabled(true);
        await persistPlanNotificationPrefs(true, planNotifyLeadMinutes);
        return;
      }

      setPlanNotifyEnabled(false);
      await persistPlanNotificationPrefs(false, planNotifyLeadMinutes);
    } catch (err) {
      event.target.checked = planNotifyEnabled;
      toast.error(err.message || '通知設定の保存に失敗しました');
    } finally {
      setSavingPlanNotify(false);
    }
  };

  const savePlanNotifyLeadMinutes = async (value) => {
    const nextLeadMinutes = Number(value);
    if (!PLAN_NOTIFY_LEAD_OPTIONS.includes(nextLeadMinutes)) return;

    setPlanNotifyLeadMinutes(nextLeadMinutes);
    setSavingPlanNotify(true);
    try {
      await persistPlanNotificationPrefs(planNotifyEnabled, nextLeadMinutes);
    } catch (err) {
      setPlanNotifyLeadMinutes(
        PLAN_NOTIFY_LEAD_OPTIONS.includes(profile?.planNotifyLeadMinutes)
          ? profile.planNotifyLeadMinutes
          : DEFAULT_PLAN_NOTIFY_LEAD_MINUTES
      );
      toast.error(err.message || '通知設定の保存に失敗しました');
    } finally {
      setSavingPlanNotify(false);
    }
  };

  const handleGenerateTransferCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await createAccountTransferCode();
      setTransferCode(res.code);
      setTransferExpiresAt(res.expiresAt ?? null);
      toast.success('引き継ぎコードを発行しました');
    } catch (err) {
      toast.error(err.message || 'コードの発行に失敗しました');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleAcceptJoin = async () => {
    setAcceptingJoin(true);
    try {
      await acceptSchoolJoin();
      toast.success('参加しました。画面を更新します');
      window.location.reload();
    } catch (err) {
      toast.error(err.message || '参加に失敗しました');
      setAcceptingJoin(false);
    }
  };

  const handleImportTransfer = async () => {
    const code = importCode.trim();
    if (!code) {
      toast.warning('引き継ぎコードを入力してください');
      return;
    }
    setImportingTransfer(true);
    try {
      await redeemAccountTransfer({ code });
      setImportCode('');
      toast.success('以前のアカウントのデータを引き継ぎました。画面を更新します');
      window.location.reload();
    } catch (err) {
      toast.error(err.message || '引き継ぎに失敗しました');
      setImportingTransfer(false);
    }
  };

  const handleSaveName = async () => {
    if (!canEditDisplayName || !canEditSelfRegisteredDisplayName(profile)) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning('名前を入力してください');
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(email, { name: trimmed });
      if (auth.currentUser) {
        try {
          await updateAuthProfile(auth.currentUser, { displayName: trimmed });
        } catch (authErr) {
          console.warn('Auth displayName update failed:', authErr);
        }
      }
      setName(trimmed);
      setProfile((prev) => (prev ? { ...prev, name: trimmed } : prev));
      toast.success('名前を保存しました');
    } catch (err) {
      toast.error(err.message || '保存に失敗しました');
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(PASSWORD_MIN_LENGTH_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    if (!currentPassword) {
      toast.error('現在のパスワードを入力してください');
      return;
    }

    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      await updateProfile(email, { mustChangePassword: false });
      await refreshProfile();
      setMustChangePassword(false);
      toast.success('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('現在のパスワードが正しくありません');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('セキュリティのため、一度ログアウトして再度ログインしてください');
      } else {
        toast.error(err.message || 'パスワードの変更に失敗しました');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const resetDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteConfirmEmail('');
    setDeleteConfirmPhrase('');
    setDeletePassword('');
  };

  const handleDeleteAccount = async () => {
    if (!email || !canDeleteAccount) return;
    const normalizedInput = deleteConfirmEmail.trim().toLowerCase();
    if (normalizedInput !== email.trim().toLowerCase()) {
      toast.error('確認用メールアドレスが一致しません');
      return;
    }
    if (deleteConfirmPhrase.trim() !== DELETE_CONFIRM_PHRASE) {
      toast.error(`「${DELETE_CONFIRM_PHRASE}」と入力してください`);
      return;
    }
    if (!isAppleUser && !deletePassword) {
      toast.error('パスワードを入力してください');
      return;
    }

    const ok = await confirm({
      title: 'アカウントを完全に削除',
      message:
        'プロフィール・学習計画・記録・連れ勉・フィードバックなど、すべてのデータが削除され、元に戻せません。\n本当に削除しますか？',
      confirmText: '削除する',
      cancelText: 'キャンセル',
      tone: 'danger',
    });
    if (!ok) return;

    setDeletingAccount(true);
    try {
      if (isAppleUser) {
        await reauthenticateWithApple(auth.currentUser);
      } else {
        const credential = EmailAuthProvider.credential(email, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await deleteSelfRegisteredAccount();
      resetDeleteModal();
      await logout();
      toast.success('アカウントを削除しました');
      navigate('/', { replace: true });
    } catch (err) {
      if (isAppleLoginCancelled(err)) return;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('パスワードが正しくありません');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('セキュリティのため、一度ログアウトして再度ログインしてください');
      } else {
        toast.error(err.message || 'アカウントの削除に失敗しました');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const profileDetails = [
    profile?.name ? { label: '表示名', value: profile.name } : null,
    { label: 'メール', value: email },
    { label: '学校名', value: schoolName || '—' },
    profile?.grade != null && profile?.class != null && profile?.number != null
      ? {
          label: '学年・組・番号',
          value: `${profile.grade}年${profile.class}組 ${profile.number}番`,
        }
      : null,
  ].filter(Boolean);

  const passwordSectionTitle = showMandatoryPasswordChange
    ? 'パスワード変更（必須）'
    : 'パスワード変更';

  return (
    <PageLayout title="設定" contentWidth="settings">
      <div className="pb-8">
        {showMandatoryPasswordChange && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4">
            パスワードの変更が必要です。下の「パスワード変更（必須）」から新しいパスワードを設定してください。
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="contents lg:flex lg:flex-col lg:gap-4 lg:w-[min(100%,360px)] lg:shrink-0">
            <Card className="order-1 lg:order-none">
              <SectionTitle
                action={
                  <SectionHelpButton
                    ariaLabel="プロフィールの説明"
                    onClick={() => setHelpId('profile')}
                  />
                }
              >
                プロフィール
              </SectionTitle>
              <dl className="space-y-2 mb-4">
                {profileDetails.map(({ label, value }) => (
                  <div key={label} className="text-sm">
                    <dt className="text-tsure-muted">{label}</dt>
                    <dd className="text-tsure-primary font-medium break-all">{value}</dd>
                  </div>
                ))}
              </dl>
              {canEditDisplayName ? (
                <>
                  <Input label="表示名" value={name} onChange={(e) => setName(e.target.value)} />
                  <Button className="w-full mt-3 lg:w-auto" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? '保存中…' : '名前を保存'}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-tsure-muted">
                  {isTeacher
                    ? '教員・管理者の表示名は登録時の内容が使われます。'
                    : '学校配布アカウントの表示名は変更できません。変更が必要な場合は学校管理者にお問い合わせください。'}
                </p>
              )}
            </Card>

            <Card className="order-2 lg:order-none">
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
                onChange={saveShareScope}
                options={SHARE_SCOPE_OPTIONS}
                placeholder="学年のみ"
              />
              <p className="text-xs text-tsure-muted mt-2">一緒に勉強中の表示範囲に使われます</p>
            </Card>

            <Card className="order-3 lg:order-none">
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
                onChange={saveMateScope}
                options={MATE_SCOPE_OPTIONS}
                placeholder="学内のみ"
              />
              <p className="text-xs text-tsure-muted mt-2">招待経由で申請を受け付ける相手の範囲</p>
            </Card>

            {showPlanNotificationSettings && (
              <Card className="order-4 lg:order-none">
                <SectionTitle
                  action={
                    <SectionHelpButton
                      ariaLabel="学習計画の通知の説明"
                      onClick={() => setHelpId('planNotifications')}
                    />
                  }
                >
                  学習計画の通知
                </SectionTitle>
                <label className="flex items-center justify-between gap-3 text-sm text-tsure-primary">
                  <span>学習計画の開始を通知する</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-tsure-primary"
                    checked={planNotifyEnabled}
                    onChange={handlePlanNotifyToggle}
                    disabled={savingPlanNotify}
                    aria-label="学習計画の開始を通知する"
                  />
                </label>
                <div className="mt-4">
                  <p className="text-xs text-tsure-muted mb-2">開始何分前に通知するか</p>
                  <FilterSelect
                    value={String(planNotifyLeadMinutes)}
                    onChange={savePlanNotifyLeadMinutes}
                    options={PLAN_NOTIFY_LEAD_SELECT_OPTIONS}
                    placeholder="10分前"
                    disabled={!planNotifyEnabled || savingPlanNotify}
                  />
                </div>
                <p className="text-xs text-tsure-muted mt-2">
                  今日から14日先までの学習計画が対象です
                </p>
              </Card>
            )}

            {canChangePassword && (
              <Card className="order-5 lg:order-none">
                <SectionTitle
                  action={
                    <SectionHelpButton
                      ariaLabel="パスワード変更の説明"
                      onClick={() => setHelpId('password')}
                    />
                  }
                >
                  {passwordSectionTitle}
                </SectionTitle>
                <div className="space-y-3">
                  <Input
                    type="password"
                    label="現在のパスワード"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
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
                <Button
                  className="w-full mt-3 lg:w-auto"
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                >
                  {changingPassword ? '変更中…' : 'パスワードを変更'}
                </Button>
              </Card>
            )}

            {(canDeleteAccount || isSchoolProvisionedStudent) && (
              <Card className="order-6 lg:order-none border-red-200">
                <SectionTitle
                  action={
                    canDeleteAccount ? (
                      <SectionHelpButton
                        ariaLabel="アカウント削除の説明"
                        onClick={() => setHelpId('deleteAccount')}
                      />
                    ) : null
                  }
                >
                  アカウント削除
                </SectionTitle>
                {canDeleteAccount ? (
                  <>
                    <p className="text-sm text-tsure-primary leading-relaxed mb-3">
                      一般ユーザーのアカウントを削除すると、プロフィール・学習計画・記録・連れ勉・フィードバックなどがすべて削除され、取り消せません。
                    </p>
                    <Button variant="danger" className="w-full lg:w-auto" onClick={() => setDeleteModalOpen(true)}>
                      アカウントを削除
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-tsure-muted leading-relaxed">
                    学校から配布されたアカウントは、アプリから削除できません。削除が必要な場合は学校管理者にお問い合わせください。
                  </p>
                )}
              </Card>
            )}

            {pendingJoin && (
              <Card className="order-7 lg:order-none border-tsure-primary/40">
                <SectionTitle>参加の招待が届いています</SectionTitle>
                <p className="text-sm text-tsure-primary leading-relaxed mb-3">
                  {pendingJoin.schoolName
                    ? `「${pendingJoin.schoolName}」に参加しますか？`
                    : '管理アカウントへの参加の招待が届いています。参加しますか？'}
                  <br />
                  参加すると、いまのデータはそのまま管理アカウントとして引き継がれます。
                </p>
                <Button
                  className="w-full lg:w-auto"
                  onClick={handleAcceptJoin}
                  disabled={acceptingJoin}
                >
                  {acceptingJoin ? '参加中…' : '参加する'}
                </Button>
              </Card>
            )}

            {canDeleteAccount && (
              <Card className="order-8 lg:order-none">
                <SectionTitle>管理アカウントへ引き継ぐ</SectionTitle>
                <p className="text-sm text-tsure-primary leading-relaxed mb-3">
                  学校・塾などから別のアカウントを配布された場合、いまのデータ（学習計画・記録・連れ勉仲間など）をそのアカウントへ引き継げます。
                  引き継ぎコードを発行し、配布されたアカウントでログインしてコードを入力してください。
                  <br />
                  引き継ぎが完了すると、このアカウントはログインできなくなります。
                </p>
                {transferCode ? (
                  <div className="rounded-xl border border-tsure-border bg-tsure-surface px-4 py-3">
                    <p className="text-xs text-tsure-muted">引き継ぎコード</p>
                    <p className="text-2xl font-bold tracking-widest text-tsure-primary">
                      {transferCode}
                    </p>
                    <p className="text-xs text-tsure-muted mt-1">
                      {transferExpiresAt
                        ? `有効期限: ${new Date(transferExpiresAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}（約15分）`
                        : '約15分間有効です'}
                    </p>
                  </div>
                ) : (
                  <Button
                    className="w-full lg:w-auto"
                    onClick={handleGenerateTransferCode}
                    disabled={generatingCode}
                  >
                    {generatingCode ? '発行中…' : '引き継ぎコードを発行'}
                  </Button>
                )}
              </Card>
            )}

            {canImportTransfer && (
              <Card className="order-9 lg:order-none">
                <SectionTitle>以前のアカウントから引き継ぐ</SectionTitle>
                <p className="text-sm text-tsure-primary leading-relaxed mb-3">
                  以前に使っていた一般ユーザーのアカウントで発行した引き継ぎコードを入力すると、その学習データをこのアカウントに取り込めます。
                </p>
                <div className="space-y-3">
                  <Input
                    label="引き継ぎコード"
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    inputMode="numeric"
                    placeholder="6桁のコード"
                  />
                  <Button
                    className="w-full lg:w-auto"
                    onClick={handleImportTransfer}
                    disabled={importingTransfer}
                  >
                    {importingTransfer ? '引き継ぎ中…' : 'データを引き継ぐ'}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <Card className="order-4 lg:order-none lg:flex-1 lg:min-w-0 lg:self-start lg:sticky lg:top-0">
            <SectionTitle
              action={
                <SectionHelpButton
                  ariaLabel="学習内容の候補の説明"
                  onClick={() => setHelpId('subjectCatalog')}
                />
              }
            >
              学習内容の候補
            </SectionTitle>
            <p className="text-xs text-tsure-muted mb-4">
              学習計画・記録で使う科目と問題集の候補を管理します。過去の記録は変更されません。
            </p>
            <SubjectCatalogPanel
              email={email}
              catalog={subjectCatalog}
              onCatalogChange={setSubjectCatalog}
            />
          </Card>
        </div>

        <p className="text-center text-xs text-tsure-muted mt-8 pb-2">
          <Link to="/privacy" className="underline hover:text-tsure-primary">
            プライバシーポリシー
          </Link>
        </p>
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

      <Modal
        open={deleteModalOpen}
        onClose={resetDeleteModal}
        title="アカウントを削除"
      >
        <p className="text-sm text-tsure-primary leading-relaxed mb-4">
          削除される内容: プロフィール、学習計画・記録、連れ勉のつながり、教員とのフィードバック、勉強中の表示、ログイン情報など。
        </p>
        <div className="space-y-3">
          <Input
            label="確認のためメールアドレスを入力"
            type="email"
            value={deleteConfirmEmail}
            onChange={(e) => setDeleteConfirmEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label={`確認のため「${DELETE_CONFIRM_PHRASE}」と入力`}
            value={deleteConfirmPhrase}
            onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
            autoComplete="off"
          />
          {!isAppleUser && (
            <Input
              type="password"
              label="パスワード（本人確認）"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </div>
        <div className="flex flex-col gap-2 mt-6">
          <Button
            variant="danger"
            className="w-full"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount
              ? '削除中…'
              : isAppleUser
                ? 'Apple で再認証して削除'
                : 'アカウントを完全に削除'}
          </Button>
          <Button variant="secondary" className="w-full" onClick={resetDeleteModal}>
            キャンセル
          </Button>
        </div>
      </Modal>
    </PageLayout>
  );
}
