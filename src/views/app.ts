import express, { Request, Response } from "express";
import dotenv from "dotenv";
import apiRateLimit from "../middleware/rateLimit";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import secCheck from "../middleware/secCheck";
import { check } from "../middleware/check";
import { errorHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import authRoute from "../routes/V1/auth";
import adminRoute from "../routes/V1/admin/user";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import path from "path";
import userRoutes from "../routes/V1/api/user";
import { authorize } from "../middleware/authorize";


dotenv.config();

export const app = express();

app
  .use(secCheck)
  .use(apiRateLimit)
  .use(morgan("dev"))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(cookieParser());

i18next
  .use(Backend) // load translations from files
  .use(middleware.LanguageDetector) // detect language
  .init({
    fallbackLng: "en", // 🔥 fallback language

    preload: ["en", "my"], // preload languages

    ns: ["translation"], // namespace
    defaultNS: "translation",

    backend: {
      loadPath: path.join(process.cwd(), "src/locales/{{lng}}/{{ns}}.json"),
    },

    detection: {
      order: ["cookie", "header", "querystring"], // priority
      caches: ["cookie"], // store language in cookie
      lookupCookie: "lng",
    },

    interpolation: {
      escapeValue: false,
    },
  });

app.use(middleware.handle(i18next));
app.use(express.static("public"));
const uploadImagePath = process.env.UPLOAD_IMAGE_PATH || "uploads/images";
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), path.dirname(uploadImagePath))),
);

app.use("/api/v1", authRoute);
app.use("/api/v1/admin", auth, authorize(true, "ADMIN"), adminRoute);
app.use("/api/v1", userRoutes);
app.use("/api/v1/users", userRoutes);

type RequestWithUserId = Request & { userId?: number };

app.get("/health", check, (req: RequestWithUserId, res: Response) => {
  res.json({
    message: req.t("welcome"),
    userId: req.userId,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found", error: "Error_404" });
});

// Error handling middleware
app.use(errorHandler);
