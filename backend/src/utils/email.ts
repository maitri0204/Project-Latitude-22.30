import nodemailer from "nodemailer";

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const sendOTPEmail = async (
  email: string,
  name: string,
  otp: string,
  type: "signup" | "login"
): Promise<void> => {
  const transporter = createTransporter();
  const subject =
    type === "signup"
      ? "LMS - Verify Your Account"
      : "LMS - Login OTP";

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="padding: 40px;">
        <h2 style="text-align: center; margin-bottom: 8px;">
          ${type === "signup" ? "Welcome to LMS!" : "Login Verification"}
        </h2>
        <p style="text-align: center; margin-bottom: 24px;">
          Hi ${name}, here is your OTP code:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 12px; padding: 16px 32px;">
            ${otp}
          </span>
        </div>
        <p style="text-align: center; font-size: 14px;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"LMS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
};
