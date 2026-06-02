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
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { getProfile, updateProfile } from '../services/firestore/userService';
import { deleteSelfRegisteredAccount } from '../services/authApi';
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

const DELETE_CONFIRM_PHRASE = '削除する';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { email } = useAuth();
  const { isTeacher, schoolId: teacherSchoolId } = useTeacherStatus();
  const { toast, confirm } = useUiFeedback();
  const [profile, setProfile] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [name, setName] = useState('');
  const [shareScope, setShareScope] = useState('学年のみ');
  const [mateScope, setMateScope] = useState('学内のみ');
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

  const isPasswordUser =
    auth.currentUser?.providerData?.some((p) => p.providerId === 'password') ?? false;
  const isAppleUser =
    auth.currentUser?.providerData?.some((p) => p.providerId === 'apple.com') ?? false;
  const canEditDisplayName = !isTeacher && canEditSelfRegisteredDisplayName(profile);
  const canChangePassword = isPasswordUser && !isTeacher;
  const canDeleteAccount = !isTeacher && canDeleteSelfRegisteredAccount(profile);
  const isSchoolProvisionedStudent =
    !isTeacher && profile && !canDeleteSelfRegisteredAccount(profile);
  const activeHelp = helpId ? SETTINGS_SECTION_HELP[helpId] : null;

  useEffect(() => {
    if (!email) return;
    getProfile(email).then(async (p) => {
      if (!p) return;
      setProfile(p);
      setName(p.name || '');
      setShareScope(p.shareScope || '学年のみ');
      setMateScope(p.mateScope || '学内のみ');
      setSubjectCatalog(p.subjectCatalog || {});
      setMustChangePassword(p.mustChangePassword === true);
      const schoolId = p.schoolId || teacherSchoolId;
      if (schoolId) {
        const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
        setSchoolName(schoolSnap.exists() ? schoolSnap.data()?.name || '' : '');
      } else {
        setSchoolName('');
      }
    });
  }, [email, teacherSchoolId]);

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

  const passwordSectionTitle = mustChangePassword ? 'パスワード変更（必須）' : 'パスワード変更';

  return (
    <PageLayout title="設定" contentWidth="settings">
      <div className="pb-8">
        {mustChangePassword && canChangePassword && (
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
                  />
                  <Input
                    type="password"
                    label="新しいパスワード（確認）"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
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
