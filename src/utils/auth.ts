import e from "express";
import { Status } from "./../generated/prisma/enums";

export const checkUserExit = (user: any) => {
  if (user) {
    const error: any = new Error("This phone is already exits");
    error.status = 409;
    error.code = "Already Exit";
    throw error;
  }
};
export const checkOtpExpired = (isSameDate: boolean, errorCount: number) => {
  if (isSameDate && errorCount >= 5) {
    const error: any = new Error(
      "You have reached the maximum number of OTP attempts for today. Please try again tomorrow.",
    );
    error.status = 401;
    error.code = "Max OTP Attempt Reached";
    throw error;
  }
};
export const checkOtpRow= (otpRow: any) => {
  if (!otpRow) {
    const error: any = new Error("Phone number not found");
    error.status = 404;
    error.code = "OTP Not Found";
    throw error;
  }
};
export const checkOtpErrorIfSameDate = (isSameDate: boolean, errorCount: number) => {
  if (isSameDate && errorCount >= 5) {
    const error: any = new Error(
      "You have reached the maximum number of OTP attempts for today. Please try again tomorrow.",
    );
    error.status = 401;
    error.code = "Max OTP Attempt Reached";
    throw error;
  }
};
