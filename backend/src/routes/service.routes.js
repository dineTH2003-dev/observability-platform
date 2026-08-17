const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/service.controller");
const cacheMiddleware = require("../middlewares/cacheMiddleware");
const cache = require("../utils/cache");

router.get("/", cacheMiddleware(15), controller.getAll);
router.get("/:id", cacheMiddleware(15), controller.getById);
router.put("/:id/application", async (req, res, next) => {
  await cache.invalidate("route:/api/services*");
  controller.updateApplication(req, res, next);
});
router.delete("/:id", async (req, res, next) => {
  await cache.invalidate("route:/api/services*");
  controller.remove(req, res, next);
});
router.get("/:id/log-config", cacheMiddleware(30), controller.getLogConfig);
router.post("/:id/log-config", async (req, res, next) => {
  await cache.invalidate("route:/api/services*");
  controller.saveLogConfig(req, res, next);
});

module.exports = router;
