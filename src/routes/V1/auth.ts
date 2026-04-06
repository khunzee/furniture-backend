import express from "express";
import {
  createPassword,
  login,
  logout,
  register,
  verifyOtp,
} from "../../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/create-password", createPassword);
router.post("/login", login);
router.post("/logout", logout);

export default router;
