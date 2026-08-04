import { Router } from "express";
import * as userController from "./user.controller";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";

const router = Router();

router.get("/me", authenticate, userController.getCurrentUser);
router.get("/search", optionalAuthenticate, userController.search);
router.get(
    "/:id/profile",
    optionalAuthenticate,
    userController.getProfile
);

router.get("/check-username", userController.checkUsername);

router.get("/:id", optionalAuthenticate, userController.getUserById);

router.patch("/me", authenticate, userController.updateProfile);

router.patch("/avatar", authenticate, userController.updateAvatar);

router.patch("/cover", authenticate, userController.updateCover);

router.delete("/me", authenticate, userController.deleteAccount);

router.post("/profile", authenticate, userController.createProfile);

export default router;