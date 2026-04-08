import { Request, Response, NextFunction } from "express";
import { body, check, validationResult } from "express-validator";
import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";
import {
  getUserByPhone,
  createOtp,
  getOtpByPhone,
  updateOtp,
  createUser,
  updateUser,
  getUserById,
} from "../services/authService";
import {
  checkOtpExpired,
  checkUserExit,
  checkOtpRow,
  checkOtpErrorIfSameDate,
  checkUserNotExit,
} from "../utils/auth";
import { generateOtp, generateToken } from "../utils/generate";
import { get } from "node:http";
import { error } from "node:console";

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
      verifyToken,
      error: 0,
      count: 1,
    };
    const result = await updateOtp(currentOtpRow.id, otpData);

    res.status(200).json({
      message: "OTP verified successfully",
      phone: result.phone,
      token: result.verifyToken,
    });
  },
];

export const createPassword = [
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
    // Otp error count check
    if (otpRow?.error == 5) {
      const error: AppError = new Error("OTP is allowed only 5 times per day");
      error.status = 400;
      error.code = "Error_BadRequest";
      return next(error);
    }
    //token check
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
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const randToken = "I will replace refresh token soon";
    const userData = {
      phone,
      password: hashPassword,
      randToken,
    };
    const newUser = await createUser(userData);
    const accessTokenPayload = { id: newUser.id };
    const refreshTokenPayload = { id: newUser.id, phone: newUser.phone };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "15m" },
    );
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "30d" },
    );
    await updateUser(newUser.id, { randToken: refreshToken });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res
      .status(201)
      .json({ message: "Successfully created account", userId: newUser.id });
  },
];

export const login = [
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

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: AppError = new Error(errors[0].msg);
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }
    const password = req.body.password;
    let phone = req.body.phone;
    if (phone.slice(0, 2) === "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserNotExit(user);
    // wrong password is over limit
    if (user!.status === "FREEZE") {
      const error: AppError = new Error(
        "Your account is temporary locked. Please contact support.",
      );
      error.status = 401;
      error.code = "Error_AccountFrozen";
      return next(error);
    }
    const checkPassword = await bcrypt.compare(password, user!.password);
    if (!checkPassword) {
      const lastDate = new Date(user!.updateAt).toLocaleDateString();

      const today = new Date().toLocaleDateString();
      const isSameDate = lastDate === today;
      if (!isSameDate) {
        const userData = {
          errorLoginCount: 1,
        };
        await updateUser(user!.id, userData);
      } else {
        if (user!.errorLoginCount >= 3) {
          const userData = {
            status: "FREEZE",
          };
          await updateUser(user!.id, userData);
          const error: AppError = new Error(
            "Your account is temporary locked. Please contact support.",
          );
          error.status = 401;
          error.code = "Error_AccountFrozen";
          return next(error);
        } else {
          const userData = {
            errorLoginCount: { increment: 1 },
          };
          await updateUser(user!.id, userData);
        }
      }
    }
    // Authorization will be implemented soon, now just return success if password is correct
    const accessTokenPayload = { id: user!.id };
    const refreshTokenPayload = { id: user!.id, phone: user!.phone };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "15m" },
    );
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "30d" },
    );
    const userData = {
      errorLoginCount: 0,
      randToken: refreshToken,
    };
    await updateUser(user!.id, userData);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
      message: " Successfully logged in",
      userId: user!.id,
    });
  },
];
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Clear the access token and refresh token cookies
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    const error: AppError = new Error("You are not authenticated");
    error.status = 401;
    error.code = "Error_Unauthenticated";
    return next(error);
  }
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
      id: number;
      phone: string;
    };
  } catch (err) {
    const error: AppError = new Error("Invalid refresh token");
    error.status = 401;
    error.code = "Error_InvalidRefreshToken";
    return next(error);
  }
  const user = await getUserById(decoded.id);
  checkUserNotExit(user);
  if (user!.phone == decoded.phone) {
    const error: AppError = new Error("You are not authenticated");
    error.status = 401;
    error.code = "Error_Unauthenticated";
    return next(error);
  }
  const userData = {
    randToken: generateToken(),
  };
  await updateUser(user!.id, userData);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.json({ message: "Successfully logged out" });
};
export const forgotPassword = [
  body("phone", "Invalid Phone Number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
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
    const user = await getUserByPhone(req.body.phone);
    checkUserNotExit(user);
    const otp = 12345; //generateOtp();
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);
    const token = generateToken();
    const otpRow = await getOtpByPhone(phone);
    let result;

    const lastOtpRequest = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lastOtpRequest === today;
    checkOtpErrorIfSameDate(isSameDate, otpRow!.error || 0);

    if (!isSameDate) {
      const otpData = {
        otp: hashOtp,
        rememberToken: token,
        count: 1,
        error: 0,
      };
      result = await updateOtp(otpRow!.id, otpData);
    } else {
      if (otpRow!.count == 3) {
        const error: AppError = new Error(
          "You have exceeded the maximum number of OTP requests",
        );
        error.status = 400;
        error.code = "Error_MaxOtpRequests";
        return next(error);
      } else {
        const otpData = {
          otp: hashOtp,
          rememberToken: token,
          count: { increment: 1 },
        };
        result = await updateOtp(otpRow!.id, otpData);
      }
    }
    res
      .status(200)
      .json({
        message: `OTP sent to ${result.phone}`,
        token: result.rememberToken,
      });
  },
];
export const verifyOtpForPassword = [async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.status(200).json({ message: "Verify OTP for password endpoint" });
}];
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.status(200).json({ message: "Change password endpoint" });
};
