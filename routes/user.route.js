import express from "express";
import {
  authenticatUser,
  createUserAccount,
  signOutUser,
  getCurrentUserProfile,
  updateUserProfile,
} from "../controller/user.controller";
import isAuthenticated from "../middleware/auth.middleware";
import uplode from '../utils/multer' 
import { validateSignUp } from "../middleware/validation.middleware";


const router = express.Router();


//Auth route
router.post("/signup", validateSignUp, createUserAccount);
router.post("/signin", authenticatUser);
router.post("/signout", signOutUser);



//Profile route
router.get("/profile", isAuthenticated, getCurrentUserProfile);
router.patch("/profile", isAuthenticated, uplode.single("avater"), updateUserProfile);

export default router;
