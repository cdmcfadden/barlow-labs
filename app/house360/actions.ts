"use server";

import { Resend } from "resend";

export type WaitlistState = {
  status: "idle" | "success" | "error";
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message: "Email service is not configured. Please try again later.",
    };
  }

  const from = process.env.HOUSE360_FROM_EMAIL ?? "House360 <house360@barlow-labs.com>";
  const notify = process.env.HOUSE360_NOTIFY_EMAIL ?? "parth@barlow-labs.com";

  const resend = new Resend(apiKey);

  try {
    const [confirm, alert] = await Promise.all([
      resend.emails.send({
        from,
        to: email,
        subject: "You're on the House360 waitlist",
        text:
          "Thanks for joining the House360 waitlist!\n\n" +
          "House360 is one place for all your home documents, scheduled maintenance, " +
          "and recommended vendors. We'll be in touch soon with early access details.\n\n" +
          "— The House360 team at Barlow Labs",
        html:
          `<p>Thanks for joining the <strong>House360</strong> waitlist!</p>` +
          `<p>House360 is one place for all your home documents, scheduled maintenance, ` +
          `and recommended vendors. We'll be in touch soon with early access details.</p>` +
          `<p>— The House360 team at Barlow Labs</p>`,
      }),
      resend.emails.send({
        from,
        to: notify,
        replyTo: email,
        subject: `New House360 waitlist signup: ${email}`,
        text: `A new member just joined the House360 waitlist:\n\n${email}`,
        html: `<p>A new member just joined the House360 waitlist:</p><p><strong>${email}</strong></p>`,
      }),
    ]);

    if (confirm.error || alert.error) {
      console.error("Resend error", { confirm: confirm.error, alert: alert.error });
      return {
        status: "error",
        message: "We couldn't send your confirmation. Please try again.",
      };
    }

    return {
      status: "success",
      message: "You're on the list — check your inbox for confirmation.",
    };
  } catch (err) {
    console.error("Waitlist signup failed", err);
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }
}
