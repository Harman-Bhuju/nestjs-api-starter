export interface OtpEmailOptions {
  appName: string;
  recipientName: string;
  otp: string;
  /** Shown as the small uppercase label under the app name in the header. */
  eyebrow: string;
  /** Main paragraph explaining why they got this email. */
  intro: string;
  /** Accent color for the OTP box border/text — lets verification vs reset look distinct. */
  accentColor: string;
  /** Short warning line in the callout box below the OTP. */
  warning: string;
  validityMinutes: number;
}

/**
 * Single shared layout for every OTP email. Previously this markup was
 * duplicated almost verbatim between "verify your email" and "reset your
 * password" (~70 lines each, differing only in a few words/colors) — now
 * it's one function parameterized by the bits that actually change.
 */
export function buildOtpEmailHtml(opts: OtpEmailOptions): string {
  const {
    appName,
    recipientName,
    otp,
    eyebrow,
    intro,
    accentColor,
    warning,
    validityMinutes,
  } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${eyebrow}</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(26,120,214,0.10);">
        <tr><td style="background:linear-gradient(90deg,#1A78D6 0%,#22c55e 100%);height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="background:#1A78D6;padding:40px 48px 32px;">
          <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">${appName}</h1>
          <p style="color:rgba(255,255,255,0.80);margin:8px 0 0;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">${eyebrow}</p>
        </td></tr>
        <tr><td style="padding:48px 48px 40px;">
          <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;">Hello, ${recipientName}!</h2>
          <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 24px;">
            ${intro} This code expires in <strong>${validityMinutes} minutes</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
            <tr><td align="center" style="background:#f0f9ff;border:2px dashed ${accentColor};border-radius:12px;padding:28px;">
              <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:${accentColor};">${otp}</span>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
                <strong>⚠ ${warning}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:24px 48px;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} <strong style="color:#1A78D6;">${appName}</strong>. All rights reserved.</p>
        </td></tr>
        <tr><td style="background:linear-gradient(90deg,#22c55e 0%,#1A78D6 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
