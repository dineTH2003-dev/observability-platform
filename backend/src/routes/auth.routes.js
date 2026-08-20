const express = require("express");
const {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

module.exports = router;
