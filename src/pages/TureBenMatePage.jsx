import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  loadMateProfiles,
  sendRequest,
  acceptRequest,
  cancelRequest,
  hideUser,
  unhideUser,
} from '../services/firestore/mateService';
import { searchUsers } from '../services/firestore/userService';
import { canMateInteract } from '../utils/mateScope';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

function MateList({ users, actions }) {
  if (!users.length) return <p className="text-sm text-tsure-muted py-2">なし</p>;
  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.email} className="flex items-center justify-between gap-2 py-2 border-b border-tsure-border last:border-0">
          <div>
            <p className="font-medium text-tsure-primary">{u.name || u.email}</p>
            {u.grade && (
              <p className="text-xs text-tsure-muted">
                {u.grade} {u.class}組
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">{actions(u)}</div>
        </li>
      ))}
    </ul>
  );
}

export default function TureBenMatePage() {
  const { email } = useAuth();
  const { toast } = useUiFeedback();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [state, setState] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showHidden, setShowHidden] = useState(false);

  const reload = async () => {
    const data = await loadMateProfiles(email);
    setState(data);
    setProfile(data.profile);
  };

  useEffect(() => {
    if (email) reload();
  }, [email]);

  const handleSearch = async () => {
    if (!query.trim() || !profile) return;
    const results = await searchUsers({
      queryText: query,
      schoolId: profile.mateScope === '学内のみ' ? profile.schoolId : undefined,
    });
    setSearchResults(
      results.filter((u) => u.email !== email && canMateInteract(profile, u))
    );
  };

  const handleSend = async (toEmail) => {
    try {
      await sendRequest(email, toEmail);
      toast.success('申請を送信しました');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const profiles = state?.profiles || {};
  const mapEmails = (emails) => emails.map((e) => profiles[e]).filter(Boolean);

  const mutual = mapEmails((state?.mutualMates || []).filter((e) => !(state?.hiddenMates || []).includes(e)));
  const pendingSent = mapEmails(state?.pendingSent || []);
  const pendingReceived = mapEmails(
    (state?.pendingReceived || []).filter((e) => !(state?.hiddenRequests || []).includes(e))
  );
  const hiddenMates = mapEmails(state?.hiddenMates || []);
  const hiddenRequests = mapEmails(state?.hiddenRequests || []);

  return (
    <PageLayout title="連れ勉">
      <Card className="sticky top-16 z-10 mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="名前で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSearch}>検索</Button>
        </div>
        {searchResults.length > 0 && (
          <ul className="mt-3 space-y-2">
            {searchResults.map((u) => (
              <li key={u.email} className="flex justify-between items-center">
                <span className="text-tsure-primary">{u.name}</span>
                <Button size="sm" onClick={() => handleSend(u.email)}>
                  申請
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-4">
        <SectionTitle>連れ勉仲間</SectionTitle>
        <MateList
          users={mutual}
          actions={(u) => (
            <Button size="sm" variant="secondary" onClick={() => hideUser(email, u.email, true).then(reload)}>
              非表示
            </Button>
          )}
        />
      </Card>

      <Card className="mb-4">
        <SectionTitle>承認待ち（相手から）</SectionTitle>
        <MateList
          users={pendingReceived}
          actions={(u) => (
            <>
              <Button size="sm" onClick={() => acceptRequest(email, u.email).then(reload)}>
                承認
              </Button>
              <Button size="sm" variant="secondary" onClick={() => hideUser(email, u.email, false).then(reload)}>
                非表示
              </Button>
            </>
          )}
        />
      </Card>

      <Card className="mb-4">
        <SectionTitle>申請中</SectionTitle>
        <MateList
          users={pendingSent}
          actions={(u) => (
            <Button size="sm" variant="secondary" onClick={() => cancelRequest(email, u.email).then(reload)}>
              取消
            </Button>
          )}
        />
      </Card>

      <Button variant="ghost" className="!text-tsure-on-primary w-full" onClick={() => setShowHidden((v) => !v)}>
        {showHidden ? '非表示リストを閉じる' : '非表示リストを表示'}
      </Button>

      {showHidden && (
        <>
          <Card className="mt-4">
            <SectionTitle>非表示の仲間</SectionTitle>
            <MateList
              users={hiddenMates}
              actions={(u) => (
                <Button size="sm" onClick={() => unhideUser(email, u.email, true).then(reload)}>
                  再表示
                </Button>
              )}
            />
          </Card>
          <Card className="mt-4">
            <SectionTitle>非表示の申請</SectionTitle>
            <MateList
              users={hiddenRequests}
              actions={(u) => (
                <Button size="sm" onClick={() => unhideUser(email, u.email, false).then(reload)}>
                  再表示
                </Button>
              )}
            />
          </Card>
        </>
      )}
    </PageLayout>
  );
}
