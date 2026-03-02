import bcrypt from "bcryptjs";

export const generateOTP = (length: number = 4): string => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
};

export const hashOTP = (otp: string): string => {
  return bcrypt.hashSync(otp, 10);
};

export const compareOTP = (otp: string, hash: string): boolean => {
  return bcrypt.compareSync(otp, hash);
};

export const isOTPExpired = (expiresAt: Date): boolean => {
  return new Date() > new Date(expiresAt);
};

export const getOTPExpiration = (minutes: number = 10): Date => {
  return new Date(Date.now() + minutes * 60 * 1000);
};
