import multer, { FileFilterCallback } from "multer";
import { mkdirSync } from "fs";
import path from "path";

const uploadImageDir = path.resolve(
  process.cwd(),
  process.env.UPLOAD_IMAGE_PATH || "uploads/images",
);
const optimizedImageDir = path.resolve(
  process.cwd(),
  process.env.OPTIMIZED_IMAGE_PATH || "uploads/optimizeimages",
);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/jpg"]);

mkdirSync(uploadImageDir, { recursive: true });
mkdirSync(optimizedImageDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadImageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const elevenDigitId = Math.floor(
      10000000000 + Math.random() * 90000000000,
    ).toString();
    cb(null, `${elevenDigitId}${ext}`);
  },
});
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  cb(null, allowedMimeTypes.has(file.mimetype));
};

export const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // maximum file size is 5MB
  fileFilter,
});
