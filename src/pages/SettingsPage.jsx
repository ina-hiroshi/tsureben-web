import { useEffect, useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, updateProfile } from '../services/firestore/userService';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

export default function SettingsPage() {
  const { email } = useAuth();
  const { toast } = useUiFeedback();
  const [shareScope, setShareScope] = useState('学年のみ');
  const [mateScope, setMateScope] = useState('学内のみ');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!email) return;
    getProfile(email).then((p) => {
      if (!p) return;
      setShareScope(p.shareScope || '学年のみ');
      setMateScope(p.mateScope || '学内のみ');
      setMustChangePassword(p.mustChangePassword === true);
    });
  }, [email]);

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

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('6文字以上のパスワードを入力してください');
      return;
    }
    await updatePassword(auth.currentUser, newPassword);
    await updateProfile(email, { mustChangePassword: false });
    setMustChangePassword(false);
    setNewPassword('');
    toast.success('パスワードを変更しました');
  };

  return (
    <PageLayout title="設定" contentWidth="narrow">
      <div className="space-y-4 pb-8 md:mx-auto">
        <Card>
          <SectionTitle>公開範囲</SectionTitle>
          <Select value={shareScope} onChange={(e) => saveShareScope(e.target.value)}>
            <option value="学年のみ">学年のみ</option>
            <option value="組のみ">組のみ</option>
            <option value="連れ勉仲間のみ">連れ勉仲間のみ</option>
          </Select>
          <p className="text-xs text-tsure-muted mt-2">一緒に勉強中の表示範囲に使われます</p>
        </Card>

        <Card>
          <SectionTitle>連れ勉の申請範囲</SectionTitle>
          <Select value={mateScope} onChange={(e) => saveMateScope(e.target.value)}>
            <option value="学内のみ">学内のみ</option>
            <option value="学内外">学内外</option>
          </Select>
          <p className="text-xs text-tsure-muted mt-2">招待経由で申請を受け付ける相手の範囲</p>
        </Card>

        {mustChangePassword && (
          <Card>
            <SectionTitle>パスワード変更（必須）</SectionTitle>
            <Input
              type="password"
              label="新しいパスワード"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button className="w-full mt-3" onClick={handlePasswordChange}>
              パスワードを変更
            </Button>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
