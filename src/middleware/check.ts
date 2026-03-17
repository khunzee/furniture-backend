import { Request, Response, NextFunction } from "express";

type RequestWithUserId = Request & { userId?: number };

export const check = (
  req: RequestWithUserId,
  res: Response,
  next: NextFunction,
) => {
  req.userId = 12345;
  next();
};
