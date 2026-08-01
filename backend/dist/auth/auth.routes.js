import { Router } from "express";
import { signup } from "./signup";
import { login } from "./login";
console.log("✅ Auth routes loaded");
const router = Router();
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Auth router working"
    });
});
router.post("/signup", signup);
router.post("/login", login);
export default router;
