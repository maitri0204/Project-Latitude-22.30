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
      ? "Latitude LMS - Verify Your Account"
      : "Latitude LMS - Login OTP";

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #f4f6fb; padding: 40px 20px;">
      <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(45, 91, 255, 0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #2d5bff, #5b8def); padding: 12px; border-radius: 12px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">L</span>
          </div>
        </div>
        <h2 style="text-align: center; color: #1a1d2e; margin-bottom: 8px;">
          ${type === "signup" ? "Welcome to Latitude!" : "Login Verification"}
        </h2>
        <p style="text-align: center; color: #64748b; margin-bottom: 24px;">
          Hi ${name}, here is your OTP code:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: linear-gradient(135deg, #2d5bff, #5b8def); color: white; font-size: 32px; font-weight: bold; letter-spacing: 12px; padding: 16px 32px; border-radius: 12px;">
            ${otp}
          </span>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 14px;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Latitude LMS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
};
