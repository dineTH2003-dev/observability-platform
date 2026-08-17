const express = require("express");
const router = express.Router();
const controller = require("../controllers/host.controller");
const cacheMiddleware = require("../middleware/cacheMiddleware");
const cache = require("../utils/cache");

router.post("/", async (req, res, next) => {
  await cache.invalidate("route:/api/hosts*");
  controller.create(req, res, next);
});
router.get("/", cacheMiddleware(15), controller.getAll);
router.get("/:id", cacheMiddleware(15), controller.getById);
router.put("/:id", async (req, res, next) => {
  await cache.invalidate("route:/api/hosts*");
  controller.update(req, res, next);
});
router.delete("/:id", async (req, res, next) => {
  await cache.invalidate("route:/api/hosts*");
  controller.remove(req, res, next);
});
router.get("/:id/download-installer", controller.downloadInstaller);

module.exports = router;
