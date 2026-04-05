import nodemailer from "nodemailer";

const EMAIL_FROM = process.env.BETTER_GOV_EMAIL_FROM?.trim() ?? "";
const EMAIL_REPLY_TO = process.env.BETTER_GOV_EMAIL_REPLY_TO?.trim() ?? "";
const APP_URL = process.env.BETTER_GOV_APP_URL?.trim() ?? "http://127.0.0.1:8080";
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() ?? "";
const SMTP_HOST = process.env.BETTER_GOV_SMTP_HOST?.trim() ?? "";
const SMTP_PORT = Number(process.env.BETTER_GOV_SMTP_PORT?.trim() ?? "465");
const SMTP_USER = process.env.BETTER_GOV_SMTP_USER?.trim() ?? "";
const SMTP_PASS = process.env.BETTER_GOV_SMTP_PASS?.trim() ?? "";
const SMTP_SECURE = (process.env.BETTER_GOV_SMTP_SECURE?.trim() ?? "1") !== "0";
const DEV_AUTH_CODES = process.env.NODE_ENV !== "production" || process.env.BETTER_GOV_DEV_AUTH_CODES === "1";

export const isDevelopmentAuthEnabled = () => DEV_AUTH_CODES;

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export type EmailDeliveryResult =
  | {
      mode: "development";
      devCode: string;
    }
  | {
      mode: "resend";
    }
  | {
      mode: "smtp";
    };

const accountEmailHtml = (code: string) => `
  <div style="background:#0f0c0a;color:#f4ede7;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;padding:32px;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #2b241f;background:#171210;padding:24px;">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#9e8f81;">better-gov</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.4;font-weight:600;color:#f4ede7;">Your university sign-in code</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#c2b4a7;">
        Enter this code to sign in. It expires in 10 minutes and can only be used once.
      </p>
      <div style="margin:0 0 20px;border:1px solid #2b241f;background:#0f0c0a;padding:16px;font-size:28px;letter-spacing:0.32em;text-align:center;color:#f4ede7;">
        ${code}
      </div>
      <p style="margin:0;font-size:12px;line-height:1.7;color:#9e8f81;">
        If you did not request this code, you can ignore this message. Return to
        <a href="${APP_URL}" style="color:#f4ede7;"> better-gov</a>.
      </p>
    </div>
  </div>
`;

export const getEmailDeliveryMode = () => {
  if (RESEND_API_KEY && EMAIL_FROM) {
    return "resend" as const;
  }

  if (SMTP_HOST && SMTP_USER && SMTP_PASS && EMAIL_FROM) {
    return "smtp" as const;
  }

  return "development" as const;
};

export const assertEmailDeliveryConfigured = () => {
  if (getEmailDeliveryMode() !== "development") {
    return;
  }

  if (!DEV_AUTH_CODES) {
    throw new EmailDeliveryError(
      "Email delivery is not configured. Set Resend or SMTP credentials, or enable BETTER_GOV_DEV_AUTH_CODES for local development.",
    );
  }
};

export const sendSignInCodeEmail = async (email: string, code: string): Promise<EmailDeliveryResult> => {
  const mode = getEmailDeliveryMode();

  if (mode === "development") {
    assertEmailDeliveryConfigured();
    console.log(`[auth] dev sign-in code for ${email}: ${code}`);
    return {
      mode: "development",
      devCode: code,
    };
  }

  if (mode === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {}),
        subject: "Your better-gov sign-in code",
        html: accountEmailHtml(code),
        text: `Your better-gov sign-in code is ${code}. It expires in 10 minutes.`,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new EmailDeliveryError(`Email delivery failed${message ? `: ${message}` : "."}`);
    }

    return {
      mode: "resend",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
      subject: "Your better-gov sign-in code",
      html: accountEmailHtml(code),
      text: `Your better-gov sign-in code is ${code}. It expires in 10 minutes.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP delivery failed.";
    throw new EmailDeliveryError(`Email delivery failed: ${message}`);
  }

  return {
    mode: "smtp",
  };
};
