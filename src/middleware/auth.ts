import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface CustomRequest extends Request {
  userId?: number;
}

export const auth = (req: CustomRequest, res: Response, next: NextFunction) => {
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    const error: any = new Error("You are not authenticated");
    error.status = 401;
    error.code = "Error_Unauthenticated";
    return next(error);
  }

  // Try to verify access token first
  if (accessToken) {
    try {
      const decoded = jwt.verify(
        accessToken,
        process.env.ACESS_TOKEN_SECRET!,
      ) as {
        id: number;
      };
      req.userId = decoded.id;
      return next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        // Access token expired, attempt to refresh
      } else {
        error.message = "Invalid access token";
        error.status = 401;
        error.code = "Error_InvalidToken";
        return next(error);
      }
    }
  }

  // Refresh access token using refresh token
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as {
      id: number;
    };

    // Create new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.ACESS_TOKEN_SECRET!,
      { expiresIn: "15m" },
    );

    // Set new access token in cookies
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 15 * 60 * 1000,
    });

    req.userId = decoded.id;
    next();
  } catch (error: any) {
    const refreshError: any = new Error("You are not authenticated");
    refreshError.status = 401;
    refreshError.code = "Error_Unauthenticated";
    return next(refreshError);
  }
};
