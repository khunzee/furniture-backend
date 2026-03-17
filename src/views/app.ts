import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import apiRateLimit from "../middleware/rateLimit";
import morgan from "morgan";
import secCheck from "../middleware/secCheck";
import { check } from "../middleware/check";

dotenv.config();

export const app = express();

app
  .use(secCheck)
  .use(apiRateLimit)
  .use(morgan("dev"))
  .use(express.json())
  .use(express.urlencoded({ extended: true }));

type RequestWithUserId = Request & { userId?: number };

app.get("/health", check, (req: RequestWithUserId, res: Response) => {
  res.json({
    message: "Hello we are ready for sending response",
    userId: req.userId,
  });
});
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "sever error";
  const errorCode = error.code || "Error_code";
  res.status(status).json({ message, error: errorCode });
});
