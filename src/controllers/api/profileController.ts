import { Request, Response, NextFunction } from "express";
import { check, query, validationResult } from "express-validator";
import { getUserById, updateUser } from "../../services/authService";
import { checkUserNotExit } from "../../utils/auth";
import { checkUploadFile } from "../../utils/check";
import { unlink } from "fs/promises";
import path from "path";
import { imageOptimizedQueue } from "../../jobs/queues/imageOptimizeQueue";

interface CustomRequest extends Request {
  userId?: number;
  file?: Express.Multer.File;
}

const uploadImageDir = path.resolve(
  process.cwd(),
  process.env.UPLOAD_IMAGE_PATH || "uploads/images",
);

const optimizedImageDir = path.resolve(
  process.cwd(),
  process.env.OPTIMIZED_IMAGE_PATH || "uploads/optimizeimages",
);

const optimizedImagePath =
  process.env.OPTIMIZED_IMAGE_PATH || "uploads/optimizeimages";

const toOptimizedWebpName = (fileName: string) =>
  `${path.parse(fileName).name}.webp`;

const safeUnlink = async (filePath: string) => {
  try {
    await unlink(filePath);
  } catch {
    // Ignore unlink failures for non-existing files.
  }
};

export const changeLanguage = [
  query("lng", "invalid language code.")
    .trim()
    .notEmpty()
    .matches("^[a-z]+$")
    .isLength({ min: 2, max: 3 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0].msg);
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }

    const { lng } = req.query;

    req.i18n.changeLanguage(lng as string); // 🔥 change immediately

    res.cookie("lng", lng);

    res.status(200).json({
      message: req.t("changeLan", { lang: lng }),
    });
  },
];
export const testPermission = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const info = {
    title: "Test Permission",
  };

  res.status(200).json(info);
};
export const uploadProfile = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const uploadedFile = req.file;

  try {
    if (!req.userId) {
      const error: any = new Error("You are not authenticated");
      error.status = 401;
      error.code = "Error_Unauthenticated";
      return next(error);
    }

    checkUploadFile(uploadedFile);
    const user = await getUserById(req.userId);
    checkUserNotExit(user);

    const newImageName = uploadedFile!.filename;
    const optimizedImageName = toOptimizedWebpName(newImageName);

    if (user?.image) {
      await safeUnlink(path.join(uploadImageDir, user.image));
      await safeUnlink(
        path.join(optimizedImageDir, toOptimizedWebpName(user.image)),
      );
    }

    await updateUser(req.userId, { image: newImageName });

    await imageOptimizedQueue.add("image-optimization", {
      fileName: uploadedFile!.filename,
      sourcePath: uploadedFile!.path,
      outputDir: optimizedImageDir,
    });
    return res.status(200).json({
      message: req.t("Profile Picture upload SuccessFully"),
      image: newImageName,
      optimizedImagePath: path.join(optimizedImagePath, optimizedImageName),
    });
  } catch (error) {
    if (uploadedFile) {
      await safeUnlink(uploadedFile.path);
      await safeUnlink(
        path.join(
          optimizedImageDir,
          toOptimizedWebpName(uploadedFile.filename),
        ),
      );
    }

    return next(error);
  }
};
