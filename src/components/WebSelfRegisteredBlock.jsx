import { getAppStoreUrl } from '../constants/appLinks';
import { logout } from '../utils/authSession';

export default function WebSelfRegisteredBlock() {
  const appStoreUrl = getAppStoreUrl();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#4b4039] text-[#ede3d2] px-6">
      <div className="max-w-lg bg-[#ede3d2] text-[#5a3e28] shadow-md rounded-2xl p-8 space-y-4 text-center">
        <h1 className="text-2xl font-semibold">iOS アプリからご利用ください</h1>
        <p className="text-sm leading-relaxed">
          一般ユーザーは Web 版では利用できません。iOS アプリからログインしてください。
        </p>
        {appStoreUrl ? (
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl bg-[#5a3e28] px-4 py-2 text-white"
          >
            App Store でアプリを入手
          </a>
        ) : (
          <p className="text-xs text-[#5a3e28]/70">App Store で「連れ勉」を検索してください。</p>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className="block w-full text-sm text-[#5a3e28] underline"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
