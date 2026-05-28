import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, LogOut, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacherStatus } from '../../hooks/useTeacherStatus';
import { useTeacherWorkspaceOptional } from '../../contexts/TeacherWorkspaceContext';
import { getProfile } from '../../services/firestore/userService';
import { logout } from '../../utils/authSession';
import {
  NAV_ITEMS,
  TEACHER_NAV_ITEMS,
  TEACHER_MODE_ENTRY,
  STUDENT_MODE_ENTRY,
  STUDENT_FEEDBACK_NAV_ITEM,
  isTeacherModePath,
} from '../../utils/navConfig';
import AppLogo from './AppLogo';
import AppIcon from './AppIcon';
import StudentPickerPanel from '../teacher/StudentPickerPanel';

const SIDEBAR_BTN = {
  admin:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-tsure-surface text-tsure-primary border border-tsure-border hover:bg-tsure-surface-hover',
  settings:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-tsure-surface text-tsure-primary border border-tsure-border hover:bg-tsure-surface-hover',
  logout:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-white/15 text-tsure-on-primary border border-white/35 hover:bg-white/25',
  accent:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-tsure-accent/20 text-tsure-on-primary border border-tsure-accent/40 hover:bg-tsure-accent/30 font-semibold',
  switchSchool:
    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-white/10 text-tsure-on-primary border border-white/25 hover:bg-white/20',
};

function NavLinkItem({ item, isActive, onNavigate }) {
  return (
    <li>
      <Link
        to={item.to}
        aria-current={isActive ? 'page' : undefined}
        onClick={onNavigate}
        className={`flex items-center gap-3.5 px-3 py-3 min-h-touch rounded-lg text-tsure-on-primary no-underline transition ${
          isActive ? 'bg-white/10 font-bold' : 'hover:bg-white/10'
        }`}
      >
        <AppIcon icon={item.icon} size="lg" />
        <span className="text-base">{item.label}</span>
      </Link>
    </li>
  );
}

export default function AppSidebar() {
  const [displayName, setDisplayName] = useState('');
  const { email, userName } = useAuth();
  const { isSchoolAdmin, isTeacher, isSuperAdmin } = useTeacherStatus();
  const workspace = useTeacherWorkspaceOptional();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) return;
    getProfile(email).then((p) => {
      if (p?.name) setDisplayName(p.name);
    });
  }, [email]);

  const name = displayName || userName || '';
  const inTeacherMode = isTeacher && isTeacherModePath(location.pathname);
  const showStudentList = inTeacherMode && workspace?.effectiveSchoolId;
  const logoTarget = inTeacherMode ? '/teacher/live' : '/home';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/teacher/live') {
      return location.pathname === '/teacher/live' || location.pathname === '/teacher';
    }
    return location.pathname === path;
  };

  const handleSwitchSchool = () => {
    workspace?.clearSelectedSchoolId();
  };

  const handleSelectStudent = (student) => {
    workspace?.selectStudent(student);
    if (location.pathname !== '/teacher/students') {
      navigate('/teacher/students');
    }
  };

  const navItems = inTeacherMode ? TEACHER_NAV_ITEMS : NAV_ITEMS;
  const extraNavItems = !inTeacherMode && !isTeacher ? [STUDENT_FEEDBACK_NAV_ITEM] : [];

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 sticky top-0 self-start h-dvh bg-tsure-primary border-r border-tsure-border pt-[var(--safe-top)] ${
        showStudentList ? 'w-72' : 'w-60'
      }`}
    >
      <div className="px-4 h-[var(--app-subheader-height)] flex items-center border-b border-white/10">
        <Link to={logoTarget} className="no-underline hover:opacity-90 transition inline-block">
          <AppLogo variant="header" theme="dark" className="scale-90 origin-left" />
        </Link>
      </div>

      <nav
        className={`flex-1 px-2 py-3 min-h-0 ${
          showStudentList ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
        }`}
        aria-label="メインナビゲーション"
      >
        <ul className="space-y-1.5 shrink-0">
          {!inTeacherMode && isTeacher && (
            <li>
              <Link
                to={TEACHER_MODE_ENTRY.to}
                className={`flex items-center gap-3.5 px-3 py-3 min-h-touch rounded-lg text-tsure-on-primary no-underline transition ${SIDEBAR_BTN.accent}`}
              >
                <AppIcon icon={TEACHER_MODE_ENTRY.icon} size="lg" />
                <span className="text-base">{TEACHER_MODE_ENTRY.label}</span>
              </Link>
            </li>
          )}

          {navItems.map((item) => (
            <NavLinkItem key={item.to} item={item} isActive={isActive(item.to)} />
          ))}

          {extraNavItems.map((item) => (
            <NavLinkItem key={item.to} item={item} isActive={isActive(item.to)} />
          ))}

          {inTeacherMode && isTeacher && (
            <li className="pt-2 mt-2 border-t border-white/10">
              <Link
                to={STUDENT_MODE_ENTRY.to}
                className={`flex items-center gap-3.5 px-3 py-3 min-h-touch rounded-lg text-tsure-on-primary no-underline transition hover:bg-white/10`}
              >
                <AppIcon icon={STUDENT_MODE_ENTRY.icon} size="lg" />
                <span className="text-base">{STUDENT_MODE_ENTRY.label}</span>
              </Link>
            </li>
          )}
        </ul>

        {showStudentList && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col min-h-0 flex-1 overflow-hidden">
            <StudentPickerPanel
              schoolId={workspace.effectiveSchoolId}
              selectedEmail={workspace.selectedStudent?.email}
              onSelect={handleSelectStudent}
              elevatedSelect
              sidebar
            />
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {inTeacherMode && isSuperAdmin && workspace && (
          <button type="button" onClick={handleSwitchSchool} className={SIDEBAR_BTN.switchSchool}>
            <AppIcon icon={Building2} size="sm" />
            学校を切替
          </button>
        )}
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
