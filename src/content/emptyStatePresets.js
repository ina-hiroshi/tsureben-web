import {
  Calendar,
  ClipboardList,
  FilterX,
  LineChart,
  PieChart,
  QrCode,
  Timer,
  UserPlus,
  Users,
} from 'lucide-react';

export const STUDY_PLAN_EMPTY = {
  icon: Calendar,
  title: 'この日の計画はありません',
  description: '勉強する科目と時間帯を登録して、一日の流れを整理しましょう。',
  steps: ['上の「計画を追加」ボタンをタップ', '教科・科目・開始・終了時刻を入力して保存'],
};

export const HOME_PLAN_EMPTY = {
  icon: Calendar,
  title: '今日の計画はありません',
  description: '学習計画を立てると、ホームで今日やることを確認できます。',
  steps: ['右上の「編集」から学習計画ページを開く', '「計画を追加」で科目と時間帯を登録する'],
};

export const STUDY_LOG_EMPTY = {
  icon: ClipboardList,
  title: 'この日の記録はありません',
  description: 'タイマーで学習すると自動で記録されます。計測漏れは手動でも追加できます。',
  steps: ['「学習タイマー」で勉強を開始・終了する', 'または上の「計測漏れを追加」から手動登録する'],
};

export const DAILY_SUBJECT_EMPTY = {
  icon: PieChart,
  title: 'この日の学習記録はありません',
  description: '記録が増えると、教科ごとの学習時間の内訳がここに表示されます。',
  steps: ['学習タイマーで勉強を記録する', '記録一覧の「計測漏れを追加」で手動登録も可能'],
};

export const STUDY_TIMELINE_EMPTY = {
  icon: LineChart,
  title: 'この期間の学習記録がありません',
  description: '日々の学習を記録すると、ここに推移グラフが表示されます。',
  steps: ['学習タイマーで勉強時間を記録する', '記録ページで日ごとの内訳を確認する'],
};

export const TODAY_SUMMARY_EMPTY = {
  icon: Timer,
  title: 'まだ今日の記録がありません',
  description: '学習タイマーで記録すると、科目別の内訳がここに表示されます。',
  steps: ['下の「学習を始める」またはタイマーページを開く', '勉強が終わったら停止して記録を保存する'],
  variant: 'compact',
};

export const PRESENCE_EMPTY = {
  icon: Users,
  title: '今は誰も勉強していません',
  description: '連れ勉仲間がタイマーを使うと、ここに勉強中の仲間が表示されます。',
  steps: ['連れ勉仲間を招待する', '一緒に「学習タイマー」を始める'],
};

export const PRESENCE_TIMER_EMPTY = {
  ...PRESENCE_EMPTY,
  title: '周りに勉強中の人はいません',
  description: '連れ勉仲間がタイマーを使うと、ここに表示されます。',
};

export const TEACHER_PRESENCE_EMPTY = {
  icon: Users,
  title: '現在学習中の生徒はいません',
  description: '生徒が学習タイマーを使うと、学校内のセッションがここに表示されます。',
  variant: 'compact',
};

export const MATE_NO_MUTUAL = {
  icon: UserPlus,
  title: '連れ勉仲間がいません',
  description: '仲間と一緒に勉強状況を共有できます。まずは招待から始めましょう。',
  steps: ['上の「仲間を招待」でQRまたはリンクを共有', '相手の申請を承認して連れ勉を開始'],
};

export const MATE_FILTER_NO_MATCH = {
  icon: FilterX,
  title: '条件に一致する仲間がいません',
  description: '検索やフィルターの条件を変えると、一覧に表示される仲間が変わります。',
  steps: ['検索キーワードや学校・学年の条件を見直す', '絞り込みをクリアして全員を表示する'],
};

export const MATE_PENDING_RECEIVED_EMPTY = {
  icon: Users,
  title: '承認待ちの申請はありません',
  description: '相手から連れ勉申請が届くと、ここに表示されます。',
  steps: ['「仲間のQRを読み取る」で相手の招待に参加', 'または自分の招待QRを相手に見せる'],
  variant: 'compact',
};

export const MATE_PENDING_SENT_EMPTY = {
  icon: Users,
  title: '送信した申請はありません',
  description: '相手のQRを読み取るか、招待リンクから申請するとここに表示されます。',
  steps: ['「仲間のQRを読み取る」で申請する', '相手が承認すると連れ勉仲間になります'],
  variant: 'compact',
};

export const MATE_HIDDEN_EMPTY = {
  icon: Users,
  title: '一覧から隠した項目はありません',
  description: '仲間や申請を一覧から隠すと、ここで確認・復元できます。',
  variant: 'compact',
};

export const INVITE_QR_EXPIRED = {
  icon: QrCode,
  title: 'QRコードの有効期限が切れました',
  description: '新しい招待を発行して、もう一度QRまたはリンクを共有してください。',
  steps: ['下の「新しい招待を発行」をタップ', '表示されたQRまたはリンクを相手に送る'],
  variant: 'compact',
};

export const TEACHER_STUDENT_EMPTY = {
  icon: Users,
  title: '生徒が見つかりません',
  description: '学年・組・氏名の条件を変えるか、登録状況を確認してください。',
  variant: 'compact',
};

export const TEACHER_PLAN_READONLY_EMPTY = {
  icon: Calendar,
  title: 'この日の計画はありません',
  description: '生徒が学習計画を登録すると、ここに表示されます。',
  variant: 'compact',
};

export const TEACHER_LOG_READONLY_EMPTY = {
  icon: ClipboardList,
  title: 'この日の記録はありません',
  description: '生徒が学習を記録すると、ここに表示されます。',
  variant: 'compact',
};

export const FEEDBACK_EMPTY = {
  icon: ClipboardList,
  title: 'フィードバックはまだありません',
  description: '教員からコメントが届くと、ここに表示されます。',
  steps: ['先生がコメントを送ると通知されます', '返信はこの画面から送れます'],
};

export const FEEDBACK_THREAD_EMPTY = {
  icon: ClipboardList,
  title: 'この日のフィードバックはありません',
  description: '下の入力欄から、この日の学習についてコメントを送れます。',
  variant: 'compact',
};
