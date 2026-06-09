import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AppLogo from '../components/ui/AppLogo';
import { SUPPORT_EMAIL } from '../constants/supportContact';

const EFFECTIVE_DATE = '2026年6月2日';

export default function PrivacyPolicyPage() {
  return (
    <div
      className="min-h-screen bg-tsure-bg p-4"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-center pt-4">
          <AppLogo variant="login" theme="dark" />
        </div>
        <Card>
          <h1 className="text-xl font-bold text-tsure-primary mb-2">プライバシーポリシー</h1>
          <p className="text-xs text-tsure-muted mb-6">施行日: {EFFECTIVE_DATE}</p>

          <div className="space-y-6 text-sm text-tsure-primary leading-relaxed">
            <section>
              <h2 className="font-semibold mb-2">1. はじめに</h2>
              <p>
                連れ勉（以下「本アプリ」）は、学習記録・連れ勉・学校とのフィードバックなどの機能を提供します。本ポリシーは、本アプリが収集・利用・保存する個人情報の取り扱いを説明するものです。
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">2. 収集する情報</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>メールアドレス、表示名（アカウント登録・ログイン）</li>
                <li>学年・組・番号、学校情報（プロフィール登録時・学校配布アカウント）</li>
                <li>学習計画・学習記録・科目候補などの学習データ</li>
                <li>連れ勉（仲間）の申請・承認状態</li>
                <li>教員とのフィードバック（コメント）</li>
                <li>「一緒に勉強中」表示用の勉強セッション情報（科目・開始時刻など）</li>
                <li>
                  カメラ（連れ勉招待用 QR コードの読み取りのみ。画像・動画は端末外に保存しません）
                </li>
                <li>
                  端末情報・広告識別子（自己登録ユーザーが iOS アプリで広告を表示する場合。児童向けの非パーソナライズ配信）
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold mb-2">3. 利用目的</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>アカウントの作成・認証・セキュリティの確保</li>
                <li>学習支援機能の提供（計画・記録・タイマー・連れ勉・フィードバック）</li>
                <li>学校・教員による生徒サポート（学校配布アカウントの場合）</li>
                <li>自己登録ユーザー向け iOS アプリの広告表示（アプリ運営のため）</li>
                <li>お問い合わせへの対応</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold mb-2">4. 第三者サービス</h2>
              <p>
                本アプリは Google Firebase（認証・データベース・クラウド関数）を利用します。教員ログインには
                Google アカウント認証を使用します。自己登録ユーザーが iOS アプリを利用する場合、広告配信のため
                Google AdMob も利用します（学校配布アカウント・教員・Web 版では広告を表示しません）。各サービスのプライバシーポリシーもあわせてご確認ください。
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  <a
                    href="https://policies.google.com/privacy"
                    className="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google プライバシーポリシー
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.google.com/admob/answer/6128543"
                    className="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google AdMob（広告）
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold mb-2">5. 保存期間</h2>
              <p>
                データはアカウントが有効な間保存されます。メール認証で自己登録した生徒は、設定画面からアカウントを削除でき、削除時に関連データを消去します。学校配布アカウントの削除は学校管理者が対応します。
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">6. お子様の利用</h2>
              <p>
                本アプリは主に学校・生徒向けです。未成年者の利用については、学校または保護者の同意・監督のもとでご利用ください。
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">7. ユーザーコンテンツ・不正利用</h2>
              <p>
                教員と生徒の間でやり取りされるフィードバックは教育目的のコミュニケーションです。迷惑行為や規約違反がある場合は、学校管理者または下記お問い合わせ先までご連絡ください。
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">8. お問い合わせ</h2>
              <p>
                プライバシーに関するご質問・データの開示・削除のご依頼（学校配布アカウント等）は{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
                  {SUPPORT_EMAIL}
                </a>{' '}
                までご連絡ください。
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">9. 改定</h2>
              <p>本ポリシーは必要に応じて改定します。重要な変更はアプリ内または Web 上でお知らせします。</p>
            </section>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <Button to="/" variant="secondary" className="w-full">
              ログイン画面へ戻る
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
