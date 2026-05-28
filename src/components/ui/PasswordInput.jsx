import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import AppIcon from './AppIcon';

export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={`w-full border rounded px-3 py-2 pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-tsure-muted hover:text-tsure-primary"
        aria-label={visible ? 'パスワードを隠す' : 'パスワードを表示'}
      >
        <AppIcon icon={visible ? EyeOff : Eye} size="sm" />
      </button>
    </div>
  );
}
