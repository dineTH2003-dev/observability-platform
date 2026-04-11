const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/service.controller");

router.get("/",                controller.getAll);
router.get("/:id",             controller.getById);
router.put("/:id/application", controller.updateApplication);
router.delete("/:id",          controller.remove);
router.get("/:id/log-config",  controller.getLogConfig);
router.post("/:id/log-config", controller.saveLogConfig);

module.exports = router;
