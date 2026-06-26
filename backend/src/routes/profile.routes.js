const express = require("express");
const fileUpload = require("express-fileupload");

const { authenticate } = require("../middlewares/auth.middleware");
const { rateLimitPasswordChanges } = require("../middlewares/profileRateLimit");
const profileController = require("../controllers/profile.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", profileController.getProfile);
router.put("/", profileController.updateProfile);
router.delete("/", profileController.deleteProfile);
router.post("/change-password", rateLimitPasswordChanges, profileController.changePassword);
router.post(
  "/upload-avatar",
  fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: false,
    createParentPath: true,
  }),
  profileController.uploadAvatar,
);
router.delete("/avatar", profileController.deleteAvatar);

module.exports = router;
