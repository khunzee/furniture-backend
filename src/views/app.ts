import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import apiRateLimit from "../middleware/rateLimit";
import morgan from "morgan";
import secCheck from "../middleware/secCheck";
import { check } from "../middleware/check";
import { errorHandler } from "../middleware/errorHandler";
import authRoute from "../routes/V1/auth";

dotenv.config();

export const app = express();

app
  .use(secCheck)
  .use(apiRateLimit)
  .use(morgan("dev"))
  .use(express.json())
  .use(express.urlencoded({ extended: true }));

app.use("/api/v1", authRoute);

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
