import express from "express";
import { check } from "../../middleware/check";

const router = express.Router();

router.get("/health", check);
