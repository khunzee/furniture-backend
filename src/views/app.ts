import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import apiRateLimit from "../middleware/rateLimit";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import secCheck from "../middleware/secCheck";
import { check } from "../middleware/check";
import { errorHandler } from "../middleware/errorHandler";
import {auth} from "../middleware/auth";
import authRoute from "../routes/V1/auth";
import userRoute from "../routes/V1/admin/user";

dotenv.config();

export const app = express();

app
  .use(secCheck)
  .use(apiRateLimit)
  .use(morgan("dev"))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(cookieParser());

app.use("/api/v1", authRoute);
app.use("/api/v1/admin",auth, userRoute);

type RequestWithUserId = Request & { userId?: number };

app.get("/health", check, (req: RequestWithUserId, res: Response) => {
  res.json({
    message: "Hello we are ready for sending response",
    userId: req.userId,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found", error: "Error_404" });
});

// Error handling middleware
app.use(errorHandler);
