import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Timer, Settings, LogOut, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacherStatus } from '../../hooks/useTeacherStatus';
import { getProfile } from '../../services/firestore/userService';
import { logout } from '../../utils/authSession';
import AppLogo from './AppLogo';
import AppIcon from './AppIcon';

const NAV_ITEMS = [
  { to: '/home', label: 'ホーム' },
  { to: '/pomodoro', label: '学習タイマー' },
  { to: '/studyplan', label: '学習計画' },
  { to: '/studyrecord', label: '学習記録' },
  { to: '/turebenmate', label: '連れ勉' },
  { to: '/settings', label: '設定' },
];

/** ダークヘッダー上で視認性の高いボタンスタイル */
const HEADER_BTN = {
  admin:
    'bg-tsure-surface text-tsure-primary border border-tsure-border font-medium hover:bg-tsure-surface-hover',
  settings:
    'bg-tsure-surface text-tsure-primary border border-tsure-border font-medium hover:bg-tsure-surface-hover',
  logout:
    'bg-white/15 text-tsure-on-primary border border-white/35 font-medium hover:bg-white/25',
};

function headerBtnClass(variant) {
  const base = `flex items-center gap-2 rounded-full shadow-md hover:scale-105 transition ${HEADER_BTN[variant]}`;
  if (variant === 'settings' || variant === 'admin') {
    return `${base} gap-2 px-3 py-2 text-sm${variant === 'settings' ? ' whitespace-nowrap' : ''}`;
  }
  return `${base} gap-1 px-3 py-2 text-sm`;
}

function HeaderActionButtons({ name, isSchoolAdmin, onAdmin, onSettings, onLogout }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {isSchoolAdmin && (
        <button
          type="button"
          onClick={onAdmin}
          className={headerBtnClass('admin')}
          title="管理者ページ"
        >
          <AppIcon icon={Shield} size="sm" />
          管理
        </button>
      )}
      {name && (
        <button
          type="button"
          onClick={onSettings}
          className={headerBtnClass('settings')}
          title="設定ページへ"
        >
          <AppIcon icon={Settings} size="sm" />
          {name} さん
        </button>
      )}
      <button
        type="button"
        onClick={onLogout}
        className={headerBtnClass('logout')}
        title="ログアウト"
      >
        <AppIcon icon={LogOut} size="sm" />
      </button>
    </div>
  );
}

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const { email, userName } = useAuth();
  const { isSchoolAdmin } = useTeacherStatus();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) return;
    getProfile(email).then((p) => {
      if (p?.name) setDisplayName(p.name);
    });
  }, [email]);

  const name = displayName || userName || '';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-tsure-bg/95 backdrop-blur sticky top-0 z-50 border-b border-white/10 mb-4 pt-[var(--safe-top)]">
      <div className="relative flex items-center justify-between px-4 py-3 min-h-touch max-w-7xl mx-auto">
        {/* 左: メニュー */}
        <button
          type="button"
          className="relative z-10 shrink-0 min-w-touch min-h-touch flex items-center justify-center rounded-lg hover:bg-white/10 text-tsure-on-primary"
          aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
          onClick={() => setOpen((v) => !v)}
        >
          <AppIcon icon={open ? X : Menu} size="lg" />
        </button>

        {/* 中央: ロゴ（ヘッダー全体の真ん中） */}
        <Link
          to="/home"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] no-underline hover:opacity-90 transition pointer-events-auto"
        >
          <AppLogo variant="header" theme="dark" />
        </Link>

        {/* 右: ボタン群（デスクトップ） */}
        <div className="relative z-10 ml-auto hidden sm:flex">
          <HeaderActionButtons
            name={name}
            isSchoolAdmin={isSchoolAdmin}
            onAdmin={() => navigate('/admin')}
            onSettings={() => navigate('/settings')}
            onLogout={handleLogout}
          />
        </div>

        {/* モバイル: 右側スペーサー（メニューと同幅で左右バランス） */}
        <div className="sm:hidden shrink-0 min-w-touch min-h-touch" aria-hidden="true" />
      </div>

      {open && (
        <nav className="absolute left-0 right-0 top-full bg-tsure-primary border-b border-tsure-border shadow-lg z-50">
          <ul className="py-2 max-w-7xl mx-auto">
            <li className="px-4 py-2 sm:hidden">
              <button
                type="button"
                onClick={() => {
                  navigate('/pomodoro');
                  setOpen(false);
                }}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-tsure-accent text-tsure-primary rounded-full min-h-touch font-semibold"
              >
                <AppIcon icon={Timer} size="md" />
                学習タイマー
              </button>
            </li>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`block px-4 py-3 min-h-touch text-tsure-on-primary hover:bg-white/10 ${
                    location.pathname === item.to ? 'bg-white/10 font-bold' : ''
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
