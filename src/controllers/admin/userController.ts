import { Request, Response, NextFunction } from "express";
interface CustomRequest extends Request {
  userId?: number;
}

export const getAllUser = async (req: CustomRequest, res: Response, next: NextFunction) => {
  res.status(200).json({ message: "get all user",currentUserId: req.userId });
};
