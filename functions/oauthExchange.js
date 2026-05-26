import { onRequest } from "firebase-functions/v2/https";

const WEB_CLIENT_ID =
  "77789669140-61nhedsb0v3i2qsthnsq0pm7nba0ahkr.apps.googleusercontent.com";

export const exchangeOAuthCode = onRequest(
  {
    region: "asia-northeast1",
    cors: true,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const { code, redirectUri } = req.body || {};
    if (!code || !redirectUri) {
      res.status(400).json({ error: "code と redirectUri が必要です" });
      return;
    }

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
      res.status(500).json({
        error:
          "GOOGLE_CLIENT_SECRET が未設定です。Firebase Console → Authentication → Google → Web client secret を環境変数に設定してください。",
      });
      return;
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: WEB_CLIENT_ID,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        res.status(400).json({
          error: tokens.error_description || tokens.error || "トークン交換に失敗しました",
        });
        return;
      }

      if (!tokens.id_token) {
        res.status(400).json({ error: "id_token が取得できませんでした" });
        return;
      }

      res.status(200).json({ id_token: tokens.id_token });
    } catch (err) {
      res.status(500).json({ error: err.message || "トークン交換エラー" });
    }
  },
);
