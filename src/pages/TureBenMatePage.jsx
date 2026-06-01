import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import {
  loadMateProfiles,
  acceptRequest,
  cancelRequest,
  hideUser,
  unhideUser,
} from '../services/firestore/mateService';
import { createMateInvite } from '../services/authApi';
import { copyMateInviteLink, shareMateInvite } from '../utils/shareInvite';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import SectionHelpButton from '../components/ui/SectionHelpButton';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { isDemoMateEmail } from '../dev/demoMate';
import { useDemoSettingsRevision } from '../hooks/useDemoSettings';
import { MATE_SECTION_HELP } from '../content/mateSectionHelp';
import MateList from '../components/MateList';
import MateMutualFilters from '../components/MateMutualFilters';
import MateFilterToggleButton from '../components/MateFilterToggleButton';
import MateInviteQrScanner from '../components/MateInviteQrScanner';
import Modal from '../components/ui/Modal';
import {
  filterMateUsers,
  hasActiveMateFilters,
} from '../utils/filterMateUsers';
import {
  INVITE_QR_EXPIRED,
  MATE_FILTER_NO_MATCH,
  MATE_HIDDEN_EMPTY,
  MATE_NO_MUTUAL,
  MATE_PENDING_RECEIVED_EMPTY,
  MATE_PENDING_SENT_EMPTY,
} from '../content/emptyStatePresets';
import EmptyState from '../components/ui/EmptyState';

function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function TureBenMatePage() {
  const { email } = useAuth();
  const navigate = useNavigate();
  const { toast } = useUiFeedback();
  const [state, setState] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [helpId, setHelpId] = useState(null);
  const [mateSearchQuery, setMateSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [mutualFiltersOpen, setMutualFiltersOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const demoRevision = useDemoSettingsRevision();

  const activeHelp = helpId ? MATE_SECTION_HELP[helpId] : null;

  const reload = useCallback(async () => {
    const data = await loadMateProfiles(email);
    setState(data);
  }, [email]);

  const runMateAction = useCallback(
    (targetEmail, action) => {
      if (isDemoMateEmail(targetEmail)) {
        toast.info('開発用の表示データです');
        return Promise.resolve();
      }
      return action().then(reload);
    },
    [reload, toast]
  );

  const handleScanSuccess = useCallback(
    (token) => {
      setScannerOpen(false);
      navigate(`/mate-invite/${token}`);
    },
    [navigate]
  );

  useEffect(() => {
    if (email) reload();
  }, [email, reload, demoRevision]);

  useEffect(() => {
    if (!invite?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [invite?.expiresAt]);

  const remainingMs = useMemo(() => {
    if (!invite?.expiresAt) return 0;
    return Math.max(0, invite.expiresAt - now);
  }, [invite?.expiresAt, now]);

  const inviteExpired = invite ? remainingMs <= 0 : false;

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      // ネイティブ(capacitor://localhost)では共有先で開けないため、本番Webオリジンで招待URLを発行する
      const inviteOrigin = Capacitor.isNativePlatform()
        ? 'https://tsureben.web.app'
        : window.location.origin;
      const data = await createMateInvite({ origin: inviteOrigin });
      const inviteUrl =
        data.inviteUrl || `${window.location.origin}/mate-invite/${data.token}`;
      setInvite({ ...data, inviteUrl });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleShare = async () => {
    if (!invite?.inviteUrl) return;
    try {
      const result = await shareMateInvite({
        inviteUrl: invite.inviteUrl,
        inviterName: invite.inviterName,
        onCopied: () => toast.success('リンクをコピーしました'),
      });
      if (result === 'shared') {
        toast.success('共有しました');
      }
    } catch (err) {
      toast.error(err.message || '共有に失敗しました');
    }
  };

  const handleCopyLink = async () => {
    if (!invite?.inviteUrl) return;
    try {
      await copyMateInviteLink(invite.inviteUrl, () => toast.success('リンクをコピーしました'));
    } catch (err) {
      toast.error(err.message || 'コピーに失敗しました');
    }
  };

  const profiles = state?.profiles || {};
  const mapEmails = (emails) => emails.map((e) => profiles[e]).filter(Boolean);

  const mutual = mapEmails((state?.mutualMates || []).filter((e) => !(state?.hiddenMates || []).includes(e)));

  const mutualFilters = useMemo(
    () => ({
      query: mateSearchQuery,
      schoolName: filterSchool,
      grade: filterGrade,
      class: filterClass,
    }),
    [mateSearchQuery, filterSchool, filterGrade, filterClass]
  );

  const filteredMutual = useMemo(
    () => filterMateUsers(mutual, mutualFilters),
    [mutual, mutualFilters]
  );

  const mutualEmptyState = useMemo(() => {
    if (mutual.length === 0) return MATE_NO_MUTUAL;
    if (hasActiveMateFilters(mutualFilters)) return MATE_FILTER_NO_MATCH;
    return MATE_NO_MUTUAL;
  }, [mutual.length, mutualFilters]);

  const clearMutualFilters = () => {
    setMateSearchQuery('');
    setFilterSchool('');
    setFilterGrade('');
    setFilterClass('');
  };

  const handleFilterGradeChange = (value) => {
    setFilterGrade(value);
    setFilterClass('');
  };
  const pendingSent = mapEmails(state?.pendingSent || []);
  const pendingReceived = mapEmails(
    (state?.pendingReceived || []).filter((e) => !(state?.hiddenRequests || []).includes(e))
  );
  const hiddenMates = mapEmails(state?.hiddenMates || []);
  const hiddenRequests = mapEmails(state?.hiddenRequests || []);

  return (
    <PageLayout title="連れ勉">
      <div className="pb-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      <Card className="space-y-4">
        <SectionTitle
          action={
            <SectionHelpButton
              ariaLabel="仲間を招待の説明"
              onClick={() => setHelpId('invite')}
            />
          }
        >
          仲間を招待
        </SectionTitle>
        <p className="text-sm text-tsure-muted">
          QRコードまたはリンクを共有して、相手に連れ勉申請してもらいます（有効期限30分）。
        </p>

        {!invite ? (
          <Button onClick={handleCreateInvite} disabled={inviteLoading} className="w-full">
            {inviteLoading ? '作成中...' : '招待を表示'}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-white p-4">
                {inviteExpired ? (
                  <EmptyState
                    {...INVITE_QR_EXPIRED}
                    action={
                      <Button onClick={handleCreateInvite} disabled={inviteLoading} size="sm">
                        {inviteLoading ? '更新中...' : '新しい招待を発行'}
                      </Button>
                    }
                  />
                ) : (
                  <QRCodeSVG value={invite.inviteUrl} size={200} />
                )}
              </div>
              <p className={`text-sm font-medium ${inviteExpired ? 'text-red-600' : 'text-tsure-primary'}`}>
                {inviteExpired ? '期限切れ' : `残り ${formatRemaining(remainingMs)}`}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleShare} disabled={inviteExpired} className="w-full">
                共有
              </Button>
              <Button
                variant="secondary"
                onClick={handleCopyLink}
                disabled={inviteExpired}
                className="w-full"
              >
                リンクをコピー
              </Button>
              <Button variant="ghost" onClick={handleCreateInvite} disabled={inviteLoading} className="w-full">
                {inviteLoading ? '更新中...' : '新しい招待を発行'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <SectionTitle
          action={
            <SectionHelpButton
              ariaLabel="仲間のQRを読み取るの説明"
              onClick={() => setHelpId('scan')}
            />
          }
        >
          仲間のQRを読み取る
        </SectionTitle>
        <p className="text-sm text-tsure-muted">
          相手が表示した招待QRを読み取ると、申請画面へ進みます。
        </p>
        <Button onClick={() => setScannerOpen(true)} className="w-full">
          QRコードを読み取る
        </Button>
      </Card>
      </div>

      <Modal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        title="招待QRを読み取る"
        fullScreenMobile
      >
        <MateInviteQrScanner
          onSuccess={handleScanSuccess}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>

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

      <div className="space-y-4">
      <Card className="overflow-visible">
        <SectionTitle
          action={
            <div className="flex items-center gap-1.5 shrink-0">
              <MateFilterToggleButton
                open={mutualFiltersOpen}
                onToggle={() => setMutualFiltersOpen((v) => !v)}
                hasActive={hasActiveMateFilters(mutualFilters)}
              />
              <SectionHelpButton
                ariaLabel="連れ勉仲間の説明"
                onClick={() => setHelpId('mutual')}
              />
            </div>
          }
        >
          <span className="inline-flex items-baseline gap-2 min-w-0">
            <span>連れ勉仲間</span>
            <span className="text-xs font-normal text-tsure-muted tabular-nums">
              {filteredMutual.length === mutual.length
                ? `${mutual.length}人`
                : `${mutual.length}人中 ${filteredMutual.length}人`}
            </span>
          </span>
        </SectionTitle>

        <MateMutualFilters
          open={mutualFiltersOpen}
          users={mutual}
          query={mateSearchQuery}
          onQueryChange={setMateSearchQuery}
          schoolName={filterSchool}
          onSchoolNameChange={setFilterSchool}
          grade={filterGrade}
          onGradeChange={handleFilterGradeChange}
          classNum={filterClass}
          onClassChange={setFilterClass}
          onClear={hasActiveMateFilters(mutualFilters) ? clearMutualFilters : undefined}
        />

        <MateList
          users={filteredMutual}
          emptyState={mutualEmptyState}
          emptyAction={
            mutual.length === 0 ? (
              <Button onClick={handleCreateInvite} disabled={inviteLoading} size="sm">
                招待を表示
              </Button>
            ) : hasActiveMateFilters(mutualFilters) ? (
              <Button variant="secondary" onClick={clearMutualFilters} size="sm">
                絞り込みをクリア
              </Button>
            ) : null
          }
          actions={(u) => (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runMateAction(u.email, () => hideUser(email, u.email, true))}
            >
              一覧から隠す
            </Button>
          )}
        />
      </Card>

      <Card>
        <SectionTitle
          action={
            <SectionHelpButton
              ariaLabel="承認待ちの説明"
              onClick={() => setHelpId('pendingReceived')}
            />
          }
        >
          承認待ち（相手から）
        </SectionTitle>
        <MateList
          users={pendingReceived}
          emptyState={MATE_PENDING_RECEIVED_EMPTY}
          actions={(u) => (
            <>
              <Button size="sm" onClick={() => runMateAction(u.email, () => acceptRequest(email, u.email))}>
                承認
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => runMateAction(u.email, () => hideUser(email, u.email, false))}
              >
                一覧から隠す
              </Button>
            </>
          )}
        />
      </Card>

      <Card>
        <SectionTitle
          action={
            <SectionHelpButton
              ariaLabel="申請中の説明"
              onClick={() => setHelpId('pendingSent')}
            />
          }
        >
          申請中
        </SectionTitle>
        <MateList
          users={pendingSent}
          emptyState={MATE_PENDING_SENT_EMPTY}
          actions={(u) => (
            <Button size="sm" variant="secondary" onClick={() => runMateAction(u.email, () => cancelRequest(email, u.email))}>
              取消
            </Button>
          )}
        />
      </Card>

      <Button variant="ghost" className="!text-tsure-on-primary w-full" onClick={() => setShowHidden((v) => !v)}>
        {showHidden ? '隠した一覧を閉じる' : '隠した仲間・申請を見る'}
      </Button>

      {showHidden && (
        <>
          <Card>
            <SectionTitle
              action={
                <SectionHelpButton
                  ariaLabel="一覧から隠した仲間の説明"
                  onClick={() => setHelpId('hiddenMates')}
                />
              }
            >
              一覧から隠した仲間
            </SectionTitle>
            <MateList
              users={hiddenMates}
              emptyState={MATE_HIDDEN_EMPTY}
              actions={(u) => (
                <Button size="sm" onClick={() => runMateAction(u.email, () => unhideUser(email, u.email, true))}>
                  一覧に戻す
                </Button>
              )}
            />
          </Card>
          <Card>
            <SectionTitle
              action={
                <SectionHelpButton
                  ariaLabel="一覧から隠した申請の説明"
                  onClick={() => setHelpId('hiddenRequests')}
                />
              }
            >
              一覧から隠した申請
            </SectionTitle>
            <MateList
              users={hiddenRequests}
              emptyState={MATE_HIDDEN_EMPTY}
              actions={(u) => (
                <Button size="sm" onClick={() => runMateAction(u.email, () => unhideUser(email, u.email, false))}>
                  一覧に戻す
                </Button>
              )}
            />
          </Card>
        </>
      )}
      </div>
      </div>
    </PageLayout>
  );
}
