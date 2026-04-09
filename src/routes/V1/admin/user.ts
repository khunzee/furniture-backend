import express from "express";
import { getAllUser } from "../../../controllers/admin/userController"

const router = express.Router();

router.get("/get-all-user", getAllUser);

export default router;