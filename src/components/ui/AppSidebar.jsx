import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacherStatus } from '../../hooks/useTeacherStatus';
import { getProfile } from '../../services/firestore/userService';
import { logout } from '../../utils/authSession';
import { NAV_ITEMS, TEACHER_NAV_ITEM, STUDENT_FEEDBACK_NAV_ITEM } from '../../utils/navConfig';
import AppLogo from './AppLogo';
import AppIcon from './AppIcon';

const SIDEBAR_BTN = {
  admin:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-tsure-surface text-tsure-primary border border-tsure-border hover:bg-tsure-surface-hover',
  settings:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-tsure-surface text-tsure-primary border border-tsure-border hover:bg-tsure-surface-hover',
  logout:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-white/15 text-tsure-on-primary border border-white/35 hover:bg-white/25',
};

export default function AppSidebar() {
  const [displayName, setDisplayName] = useState('');
  const { email, userName } = useAuth();
  const { isSchoolAdmin, isTeacher } = useTeacherStatus();
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

  const isActive = (path) => location.pathname === path;

  const extraNavItems = isTeacher
    ? [TEACHER_NAV_ITEM]
    : [STUDENT_FEEDBACK_NAV_ITEM];

  return (
    <aside className="hidden md:flex flex-col shrink-0 w-60 sticky top-0 self-start h-dvh bg-tsure-primary border-r border-tsure-border pt-[var(--safe-top)]">
      <div className="px-4 h-[var(--app-subheader-height)] flex items-center border-b border-white/10">
        <Link to="/home" className="no-underline hover:opacity-90 transition inline-block">
          <AppLogo variant="header" theme="dark" className="scale-90 origin-left" />
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto" aria-label="メインナビゲーション">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                className={`flex items-center gap-3.5 px-3 py-3 min-h-touch rounded-lg text-tsure-on-primary no-underline transition ${
                  isActive(item.to) ? 'bg-white/10 font-bold' : 'hover:bg-white/10'
                }`}
              >
                <AppIcon icon={item.icon} size="lg" />
                <span className="text-base">{item.label}</span>
              </Link>
            </li>
          ))}
          {extraNavItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                className={`flex items-center gap-3.5 px-3 py-3 min-h-touch rounded-lg text-tsure-on-primary no-underline transition ${
                  isActive(item.to) ? 'bg-white/10 font-bold' : 'hover:bg-white/10'
                }`}
              >
                <AppIcon icon={item.icon} size="lg" />
                <span className="text-base">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {isSchoolAdmin && (
          <button type="button" onClick={() => navigate('/admin')} className={SIDEBAR_BTN.admin}>
            <AppIcon icon={Shield} size="sm" />
            管理
          </button>
        )}
        {name && (
          <button type="button" onClick={() => navigate('/settings')} className={SIDEBAR_BTN.settings}>
            <AppIcon icon={Settings} size="sm" />
            <span className="truncate">{name} さん</span>
          </button>
        )}
        <button type="button" onClick={handleLogout} className={SIDEBAR_BTN.logout}>
          <AppIcon icon={LogOut} size="sm" />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
