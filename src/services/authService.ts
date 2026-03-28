import prisma from "../lib/prisma";

type CreateOtpInput = {
  phone: string;
  otp: string;
  rememberToken: string;
  verifyToken?: string | null;
  count?: number;
  error?: number;
  expiredAt?: Date;
  updatedAt?: Date;
};

export const getUserByPhone = async (phone: string) => {
  return prisma.user.findUnique({
    where: { phone },
  });
};

export const createOtp = async (otpData: CreateOtpInput) => {
  return prisma.otp.create({
    data: otpData,
  });
};
export const getOtpByPhone = async (phone: string) => {
  return prisma.otp.findUnique({
    where: { phone },
  });
};
export const updateOtp = async (id: number, otpData: any) => {
    return prisma.otp.update({
        where: { id },
        data: otpData,
    });
}
