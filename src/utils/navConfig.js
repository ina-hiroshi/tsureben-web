import { NAV_CARD_ICONS } from './navIcons';
import { GraduationCap, MessageSquare } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/home', label: 'ホーム', icon: NAV_CARD_ICONS.home },
  { to: '/pomodoro', label: '学習タイマー', icon: NAV_CARD_ICONS.timer },
  { to: '/studyplan', label: '学習計画', icon: NAV_CARD_ICONS.plan },
  { to: '/studyrecord', label: '学習記録', icon: NAV_CARD_ICONS.record },
  { to: '/turebenmate', label: '連れ勉', icon: NAV_CARD_ICONS.mate },
  { to: '/settings', label: '設定', icon: NAV_CARD_ICONS.settings },
];

export const TEACHER_NAV_ITEM = {
  to: '/teacher/students',
  label: '生徒確認',
  icon: GraduationCap,
};

export const STUDENT_FEEDBACK_NAV_ITEM = {
  to: '/feedback',
  label: '先生からのコメント',
  icon: MessageSquare,
};
