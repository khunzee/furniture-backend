import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const status = error.status || 500;
  // 🔥 translate here
  const message = req.t
    ? req.t(error.message || "common.serverError")
    : error.message;

  const errorCode = error.code || "Error_code";

  res.status(status).json({
    message,
    error: errorCode,
  });
};
