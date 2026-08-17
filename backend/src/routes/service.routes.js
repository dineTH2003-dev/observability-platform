const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/service.controller");
const cache      = require("../utils/cache");

router.get("/",                cache.middleware(15), controller.getAll);
router.get("/:id",             cache.middleware(15), controller.getById);
router.put("/:id/application", controller.updateApplication);
router.delete("/:id",          controller.remove);
router.get("/:id/log-config",  cache.middleware(30), controller.getLogConfig);
router.post("/:id/log-config", controller.saveLogConfig);

module.exports = router;
