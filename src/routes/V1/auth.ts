import express from "express";
import {
  createPassword,
  login,
  logout,
  register,
  verifyOtp,
  forgotPassword,
  changePassword,
  verifyOtpForPassword,
} from "../../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/create-password", createPassword);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", verifyOtpForPassword);
router.post("/change-password", changePassword);

export default router;
