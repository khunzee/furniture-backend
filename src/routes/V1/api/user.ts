import express from "express";

import {
  changeLanguage,
  testPermission,
  uploadProfile,
} from "../../../controllers/api/profileController";
import { auth } from "../../../middleware/auth";
import { upload } from "../../../middleware/upload";

const router = express.Router();

const profileUploadMiddlewares = [
  auth,
  upload.single("avatar"),
  uploadProfile,
] as const;

router.post("/change-language", changeLanguage);
router.get("/test-permission", testPermission);
router.patch("/profile/upload/images", ...profileUploadMiddlewares);
router.patch("/profile/upload/optimize", ...profileUploadMiddlewares);

export default router;
