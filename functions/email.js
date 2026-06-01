const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "TsureBen <noreply@itoguchi-app.jp>";
const PEN_NIB_HOSTING_URL = "https://tsureben.web.app/pen-nib.svg";

function penNibImg(sizePx) {
  return `<img src="${PEN_NIB_HOSTING_URL}" width="${sizePx}" height="${sizePx}" alt="" style="display:block;" />`;
}

const COPY = {
  register: {
    heading: "TsureBen へようこそ",
    lead: "本日より、仲間と一緒に学習を続けていきましょう。下記の認証コードを入力し、登録を完了してください。",
    banner: "目標に向かって、もう一歩進みましょう。📚",
  },
  reset: {
    heading: "おかえりなさい！",
    lead: "新しいパスワードを設定し、引き続きご利用ください。下記の認証コードを入力してください。",
    banner: "新しいパスワードで、再スタートしましょう。🔥",
  },
};

function buildHtml(code, purpose) {
  const copy = COPY[purpose] || COPY.register;
  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet" />
    <title>TsureBen 認証コード</title>
  </head>
  <body style="margin:0; padding:0; background-color:#4b4039; font-family:'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#4b4039; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ede3d2; border-radius:20px; overflow:hidden; box-shadow:0 10px 30px rgba(42,33,28,0.35);">
            <tr>
              <td align="center" style="background-color:#5a3e28; padding:32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="font-family:'Dancing Script', cursive; font-size:44px; font-weight:700; color:#ede3d2; line-height:1; padding-right:10px; vertical-align:bottom;">
                      TsureBen
                    </td>
                    <td style="vertical-align:bottom; padding-bottom:4px;">
                      ${penNibImg(40)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 36px 8px 36px;">
                <h1 style="margin:0 0 12px 0; font-size:22px; color:#5a3e28; font-weight:700;">${copy.heading}</h1>
                <p style="margin:0; font-size:15px; line-height:1.8; color:#5a3e28;">${copy.lead}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 36px;">
                <div style="display:inline-block; background-color:#ffffff; border:2px solid #ffa726; border-radius:16px; padding:20px 28px;">
                  <div style="font-size:12px; letter-spacing:2px; color:#8f735a; margin-bottom:8px;">認証コード</div>
                  <div style="font-size:40px; font-weight:700; letter-spacing:10px; color:#5a3e28;">${code}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 36px 32px 36px;">
                <div style="background-color:#ffa726; color:#5a3e28; font-weight:700; font-size:14px; border-radius:999px; padding:12px 24px; display:inline-block;">
                  ${copy.banner}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 32px 36px; border-top:1px solid #c4b5a0;">
                <p style="margin:24px 0 4px 0; font-size:12px; line-height:1.7; color:#8f735a;">
                  このコードは15分間有効です。<br />
                  心当たりのない場合は、このメールを無視してください。
                </p>
                <p style="margin:16px 0 0 0; font-family:'Dancing Script', cursive; font-size:24px; color:#5a3e28;">TsureBen</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Resend で認証コードメールを送信する。
 * RESEND_API_KEY 未設定時は警告ログのみでスキップ（開発を止めない）。
 * @param {{ to: string, code: string, purpose?: "register" | "reset" }} params
 */
export async function sendVerificationEmail({ to, code, purpose = "register" }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY が未設定のためメール送信をスキップしました。code=${code} to=${to}`
    );
    return { skipped: true };
  }

  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "【TsureBen】認証コード",
      html: buildHtml(code, purpose),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[email] Resend error status:", res.status);
    console.error("[email] Resend error body:", errorText);

    if (res.status === 403) {
      try {
        const err = JSON.parse(errorText);
        if (err.message?.includes("testing emails") || err.name === "validation_error") {
          throw new Error(
            "メール送信の設定が完了していません。Resend でドメイン(itoguchi-app.jp)が認証済みか確認してください。"
          );
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && !parseErr.message.startsWith("メール送信")) {
          throw parseErr;
        }
      }
    }
    throw new Error(`メール送信に失敗しました: ${errorText}`);
  }

  return { skipped: false };
}
