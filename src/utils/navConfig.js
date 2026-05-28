import { NAV_CARD_ICONS } from './navIcons';
import { GraduationCap, MessageSquare, Radio, Home } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/home', label: 'ホーム', icon: NAV_CARD_ICONS.home },
  { to: '/pomodoro', label: '学習タイマー', icon: NAV_CARD_ICONS.timer },
  { to: '/studyplan', label: '学習計画', icon: NAV_CARD_ICONS.plan },
  { to: '/studyrecord', label: '学習記録', icon: NAV_CARD_ICONS.record },
  { to: '/turebenmate', label: '連れ勉', icon: NAV_CARD_ICONS.mate },
  { to: '/settings', label: '設定', icon: NAV_CARD_ICONS.settings },
];

export const TEACHER_NAV_ITEMS = [
  { to: '/teacher/live', label: '現在学習中', icon: Radio },
];

/** @deprecated use navigation via sidebar student list */
export const TEACHER_STUDENTS_PATH = '/teacher/students';

export const TEACHER_MODE_ENTRY = {
  to: '/teacher/live',
  label: '教員モードに戻る',
  icon: GraduationCap,
};

export const STUDENT_MODE_ENTRY = {
  to: '/home',
  label: '生徒モードに切替',
  icon: Home,
};

export const STUDENT_FEEDBACK_NAV_ITEM = {
  to: '/feedback',
  label: '先生からのコメント',
  icon: MessageSquare,
};

export function isTeacherModePath(pathname) {
  return pathname.startsWith('/teacher');
}
