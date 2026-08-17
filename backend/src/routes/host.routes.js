const express = require("express");
const router = express.Router();
const controller = require("../controllers/host.controller");
const cache = require("../utils/cache");

router.post("/", controller.create);
router.get("/", cache.middleware(15), controller.getAll);
router.get("/:id", cache.middleware(15), controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.get("/:id/download-installer", controller.downloadInstaller);

module.exports = router;
