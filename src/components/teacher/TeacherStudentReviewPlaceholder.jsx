import { PanelLeft, Search } from 'lucide-react';
import AppIcon from '../ui/AppIcon';

export default function TeacherStudentReviewPlaceholder() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center min-h-[calc(100dvh-12rem)] px-8">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-tsure-on-primary">
          <AppIcon icon={PanelLeft} size="lg" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-tsure-on-primary">サイドバーから生徒を選択</h2>
          <p className="text-sm text-tsure-on-primary/70 leading-relaxed">
            左の一覧で学年・組・氏名を絞り込み、生徒を選ぶと学習計画・記録・フィードバックがここに表示されます。
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-5 py-4 text-left space-y-3">
          <p className="text-xs font-semibold text-tsure-on-primary/80 flex items-center gap-2">
            <AppIcon icon={Search} size="sm" />
            サイドバーでできること
          </p>
          <ul className="text-sm text-tsure-on-primary/65 space-y-1.5 list-disc list-inside">
            <li>学年・組・氏名で生徒を検索</li>
            <li>生徒を選んで詳細をこのエリアに表示</li>
            <li>「現在学習中」でリアルタイム状況を確認</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
