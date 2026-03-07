const express = require("express");
const { signup, login, forgotPassword } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);

module.exports = router;