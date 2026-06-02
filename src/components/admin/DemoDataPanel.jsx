import { useDemoSettings } from '../../hooks/useDemoSettings';
import Button from '../ui/Button';

function DemoToggleRow({ label, description, enabled, disabled, onChange }) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border border-[#c4b5a0] bg-white/70 px-3 py-3 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-white'
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-[#5a3e28]"
        checked={enabled}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#5a3e28]">{label}</span>
        <span className="block text-xs text-gray-600 mt-1 leading-relaxed">{description}</span>
      </span>
    </label>
  );
}

export default function DemoDataPanel() {
  const {
    canManage,
    settings,
    features,
    toggle,
    setAll,
    allEnabled,
    allDisabled,
  } = useDemoSettings();

  return (
    <div className="border border-[#c4b5a0] rounded-xl p-4 space-y-4 bg-white/50">
      <div>
        <h3 className="font-semibold text-[#5a3e28]">デモデータ</h3>
        <p className="text-sm text-gray-600 mt-1">
          UI 確認・App Store スクリーンショット用の架空データです。本番環境では super_admin
          のみが利用できます。設定はこのブラウザの localStorage に保存され、初回はすべて OFF
          です。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="text-sm"
          disabled={!canManage || allEnabled}
          onClick={() => setAll(true)}
        >
          すべて ON
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-sm"
          disabled={!canManage || allDisabled}
          onClick={() => setAll(false)}
        >
          すべて OFF
        </Button>
      </div>

      <div className="space-y-2">
        {Object.values(features).map((feature) => (
          <DemoToggleRow
            key={feature.id}
            label={feature.label}
            description={feature.description}
            enabled={settings[feature.id]}
            disabled={!canManage}
            onChange={(enabled) => toggle(feature.id, enabled)}
          />
        ))}
      </div>
    </div>
  );
}
