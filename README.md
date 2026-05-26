# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## iOS アプリ化の手順

1. **必要な環境**
   - Node.js / npm（`npm` で依存をインストール）
   - Xcode（iOSシミュレータ・実機・アーカイブ用）
   - Apple Developer アカウントとチーム、適切な署名・プロビジョニングプロファイル

2. **依存のインストールとビルド**
   - `npm install` で npm モジュールを揃える（VS Code ターミナルや `code .` で開いた状態でも問題ありません）
   - `npm run build` で Vite のビルド成果物を `dist/` に出力（`capacitor.config.json` の `webDir` が `dist` になっていることを確認）

3. **Capacitor に同期**
   - `npx cap sync ios` で `dist/` の内容をネイティブ `ios/App` にコピーし、依存（GoogleAuth など）を同期

4. **Xcode で開く**
   - `npx cap open ios` で `Runner.xcworkspace` を開き、Signing & Capabilities を設定
   - 実機／シミュレータで動作確認し、必要に応じて `Product > Archive` でアーカイブ

5. **配布・再ビルド**
   - App Store／TestFlight に送る場合は Organizer 経由でアップロード
   - Web側を変更したら再度 `npm run build` → `npx cap sync ios` → Xcode でビルド

必要であれば、Xcode 側のビルド設定や Firebase・Google 認証の plist ファイルも整える必要があります。基本的な流れはこの手順に沿って進めていけば VS Code での編集から iOS の機械まで繋がります。具体的なエラーや設定で迷ったら、その内容を教えてください。
