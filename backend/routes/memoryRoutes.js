// routes/memoryRoutes.js
const express = require("express");
const {
  getAllMemories,
  createMemory,
  updateMemory,
  saveScene,
  deleteMemory,
  deleteAllMemories
} = require("../controllers/memoryController");

const { createUploader } = require("../config/uploadConfig");

const router = express.Router();

/**
 * Helper wrapper so multer runs AFTER authMiddleware
 * and has access to req.user.id
 */
function uploadForUser(req, res, next) {
  const uploader = createUploader(req.user.id);
  uploader.single("image")(req, res, next);
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get("/", getAllMemories);

router.post("/", uploadForUser, createMemory);

router.put("/:id", uploadForUser, updateMemory);

router.patch("/:id/scene", saveScene);

router.delete("/:id", deleteMemory);

router.delete("/", deleteAllMemories);

module.exports = router;
