import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

import bcrypt from "bcrypt";
import {
  getUserByPhone,
  createOtp,
  getOtpByPhone,
  updateOtp,
} from "../services/authService";
import {
  checkOtpExpired,
  checkUserExit,
  checkOtpRow,
  checkOtpErrorIfSameDate,
} from "../utils/auth";
import { generateOtp, generateToken } from "../utils/generate";

interface AppError extends Error {
  status?: number;
  code?: string;
}

export const register = [
  body("phone", "Invalid Phone Number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 })
    .withMessage("Phone number must be between 5 and 12 digits"),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: AppError = new Error(errors[0].msg);
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }
    let phone = req.body.phone;
    if (phone.slice(0, 2) === "09") {
      phone = phone.substring(2, phone.length);
    }
    const user = await getUserByPhone(phone);

    checkUserExit(user);
    const otp = 12345; //generateOtp();
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);
    const token = generateToken();
    const otpRow = await getOtpByPhone(phone);
    let result;
    if (!otpRow) {
      const otpData = {
        phone,
        otp: hashOtp,
        rememberToken: token,
        count: 1,
      };
      result = await createOtp(otpData);
    } else {
      const lastOtpRequest = new Date(otpRow.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastOtpRequest === today;

      checkOtpExpired(isSameDate, otpRow.error || 0);
      if (!isSameDate) {
        const otpData = {
          otp: hashOtp,
          rememberToken: token,
          count: 1,
          error: 0,
        };
        result = await updateOtp(otpRow.id, otpData);
      } else {
        if (otpRow.count == 5) {
          const error: AppError = new Error(
            "Otp is allowed only 5 times per day",
          );
          error.status = 405;
          error.code = "Error_OverLimit";
          return next(error);
        } else {
          const otpData = {
            otp: hashOtp,
            rememberToken: token,
            count: { increment: 1 },
          };
          result = await updateOtp(otpRow.id, otpData);
        }
      }
    }

    res.status(200).json({
      message: `we are sending OTP to 09 ${result.phone}`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

export const verifyOtp = [
  body("phone", "Invalid Phone Number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
  body("otp", "Invalid OTP")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 5 })
    .withMessage("OTP must be exactly 5 digits"),
  body("token", "Token is required").trim().notEmpty(),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: AppError = new Error(errors[0].msg);
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }
    let { phone, otp, token } = req.body;
    if (phone.slice(0, 2) === "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserExit(user);
    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);
    const currentOtpRow = otpRow as NonNullable<typeof otpRow>;
    const lastOtpRequest = new Date(
      currentOtpRow.updatedAt,
    ).toLocaleDateString();
    const today = new Date().toLocaleDateString();

    const isSameDate = lastOtpRequest === today;
    checkOtpErrorIfSameDate(isSameDate, currentOtpRow.error);

    if (currentOtpRow.rememberToken !== token) {
      const otpData = {
        error: { increment: 1 },
      };
      await updateOtp(currentOtpRow.id, otpData);
      const error: AppError = new Error("Invalid token");
      error.status = 401;
      error.code = "Error_InvalidToken";
      return next(error);
    }

    const checkOtp = await bcrypt.compare(otp.toString(), currentOtpRow.otp);
    if (!checkOtp) {
      const otpData = {
        error: { increment: 1 },
      };
      await updateOtp(currentOtpRow.id, otpData);
      const error: AppError = new Error("Invalid OTP");
      error.status = 401;
      error.code = "Error_InvalidOTP";
      return next(error);
    }

    if (new Date() > new Date(currentOtpRow.expiredAt)) {
      const error: AppError = new Error("OTP has expired");
      error.status = 401;
      error.code = "Error_OTPExpired";
      return next(error);
    }
    const verifyToken = generateToken();
    const otpData = {
      rememberToken: verifyToken,
    };
    await updateOtp(currentOtpRow.id, otpData);

    res.status(200).json({ message: "verify-otp", token: verifyToken });
  },
];

export const confirmPassword = [
  body("phone", "Invalid Phone Number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
  body("password", "Password must be  digits")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 8, max: 8 }),
  body("token", "Token is required").trim().notEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: AppError = new Error(errors[0].msg);
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }
    let { phone, password, token } = req.body;

    const user = await getUserByPhone(phone);
    checkUserExit(user);
    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);
    if (otpRow?.error == 5) {
      const error: AppError = new Error("OTP is allowed only 5 times per day");
      error.status = 400;
      error.code = "Error_BadRequest";
      return next(error);
    }
    if (otpRow?.verifyToken !== token) {
      const otpData = {
        error: 5,
      };
      await updateOtp(otpRow!.id, otpData);
      const error: AppError = new Error("Invalid token");
      error.status = 400;
      error.code = "Error_InvalidToken";
      return next(error);
    }
    const checkOtpExisted: boolean = await bcrypt.compare(password.toString(), otpRow!.otp);
    if (!checkOtpExisted) {
      const error: AppError = new Error("Invalid password");
      error.status = 400;
      error.code = "Error_InvalidPassword";
      return next(error);
    }

    res.status(200).json({ message: "confirm-password" });
  },
];

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.status(200).json({ message: "login" });
};
