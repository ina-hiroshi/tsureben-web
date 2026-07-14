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

function NavLinkItem({ item, isActive, onNavigate, compact = false }) {
  const linkClass = compact
    ? 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-tsure-on-primary no-underline transition'
    : 'flex items-center gap-3.5 px-3 py-3 min-h-touch rounded-lg text-tsure-on-primary no-underline transition';

  return (
    <li>
      <Link
        to={item.to}
        aria-current={isActive ? 'page' : undefined}
        onClick={onNavigate}
        className={`${linkClass} ${isActive ? 'bg-white/10 font-bold' : 'hover:bg-white/10'}`}
      >
        <AppIcon icon={item.icon} size={compact ? 'md' : 'lg'} />
        <span className={compact ? 'text-sm' : 'text-base'}>{item.label}</span>
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

  const navLinkClass = showStudentList
    ? 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-tsure-on-primary no-underline transition'
    : 'flex items-center gap-3.5 px-3 py-3 min-h-touch rounded-lg text-tsure-on-primary no-underline transition';

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 sticky top-0 self-start h-dvh bg-tsure-primary border-r border-tsure-border pt-[var(--safe-top)] ${
        showStudentList ? 'w-72' : 'w-60'
      }`}
    >
      <div
        className={`px-4 flex items-center border-b border-white/10 shrink-0 ${
          showStudentList ? 'h-14' : 'h-[var(--app-subheader-height)]'
        }`}
      >
        <Link to={logoTarget} className="no-underline hover:opacity-90 transition inline-block">
          <AppLogo
            variant="header"
            theme="dark"
            className={showStudentList ? 'scale-[0.82] origin-left' : 'scale-90 origin-left'}
          />
        </Link>
      </div>

      <nav
        className={`shrink-0 px-2 ${showStudentList ? 'py-2' : 'flex-1 py-3 min-h-0 overflow-y-auto'}`}
        aria-label="メインナビゲーション"
      >
        <ul className={showStudentList ? 'space-y-0.5' : 'space-y-1.5'}>
          {!inTeacherMode && isTeacher && (
            <li>
              <Link
                to={TEACHER_MODE_ENTRY.to}
                className={`${navLinkClass} ${SIDEBAR_BTN.accent}`}
              >
                <AppIcon icon={TEACHER_MODE_ENTRY.icon} size={showStudentList ? 'md' : 'lg'} />
                <span className={showStudentList ? 'text-sm' : 'text-base'}>
                  {TEACHER_MODE_ENTRY.label}
                </span>
              </Link>
            </li>
          )}

          {navItems.map((item) => (
            <NavLinkItem
              key={item.to}
              item={item}
              isActive={isActive(item.to)}
              compact={showStudentList}
            />
          ))}

          {extraNavItems.map((item) => (
            <NavLinkItem
              key={item.to}
              item={item}
              isActive={isActive(item.to)}
              compact={showStudentList}
            />
          ))}

          {inTeacherMode && isTeacher && (
            <li className={showStudentList ? 'pt-1 mt-1 border-t border-white/10' : 'pt-2 mt-2 border-t border-white/10'}>
              <Link
                to={STUDENT_MODE_ENTRY.to}
                className={`${navLinkClass} hover:bg-white/10`}
              >
                <AppIcon icon={STUDENT_MODE_ENTRY.icon} size={showStudentList ? 'md' : 'lg'} />
                <span className={showStudentList ? 'text-sm' : 'text-base'}>
                  {STUDENT_MODE_ENTRY.label}
                </span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {showStudentList && (
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden px-2 pb-1 border-t border-white/10">
          <StudentPickerPanel
            schoolId={workspace.effectiveSchoolId}
            selectedEmail={workspace.selectedStudent?.email}
            onSelect={handleSelectStudent}
            elevatedSelect
            sidebar
          />
        </div>
      )}

      <div
        className={`border-t border-white/10 shrink-0 ${
          showStudentList ? 'px-2 py-2 space-y-1' : 'px-3 py-4 space-y-2'
        }`}
      >
        {inTeacherMode && isSuperAdmin && workspace && (
          <button
            type="button"
            onClick={handleSwitchSchool}
            className={`${SIDEBAR_BTN.switchSchool} ${showStudentList ? '!py-1.5 !px-2 !text-xs' : ''}`}
          >
            <AppIcon icon={Building2} size="sm" />
            学校を切替
          </button>
        )}
        {isSchoolAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className={`${SIDEBAR_BTN.admin} ${showStudentList ? '!py-1.5 !px-2 !text-xs' : ''}`}
          >
            <AppIcon icon={Shield} size="sm" />
            管理
          </button>
        )}
        {name && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`${SIDEBAR_BTN.settings} ${showStudentList ? '!py-1.5 !px-2 !text-xs' : ''}`}
          >
            <AppIcon icon={Settings} size="sm" />
            <span className="truncate">{name} さん</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={`${SIDEBAR_BTN.logout} ${showStudentList ? '!py-1.5 !px-2 !text-xs' : ''}`}
        >
          <AppIcon icon={LogOut} size="sm" />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
