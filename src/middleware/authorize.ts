import { Request, Response, NextFunction} from "express";
import { getUserById } from "../services/authService";

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
  
}

export const authorize = (permission: boolean, ...roles: string[])=> {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await getUserById(userId!);

    if (!user) {
      const error: any = new Error("This account has not registered yet");
      error.status = 404;
      error.code = "Error_UserNotFound";
      return next(error);
    }
    const result = roles.includes(user.role);
    if (permission && !result) {
      const error: any = new Error(
        "You are not authorized to perform this action",
      );
      error.status = 403;
      error.code = "Error_Unauthorized";
      return next(error);
    }
    if (!permission && result) {
      const error: any = new Error(
        "You are not authorized to perform this action",
      );
      error.status = 403;
      error.code = "Error_Unauthorized";
      return next(error);
    }
    req.user = user;
    next();
  };
};
