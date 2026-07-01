import { Router, type IRouter } from "express";
import express from "express";
import multer, { MulterError } from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

// After bundling, this module lives inside dist/index.mjs, so import.meta.url
// resolves to the dist directory — walk up one level to the package root.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(currentDir, "..", "uploads");
mkdirSync(uploadsDir, { recursive: true });

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    // Ignore the client-supplied filename entirely (avoids path traversal /
    // collisions) and derive the extension from the validated mimetype.
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${MIME_TO_EXT[file.mimetype]}`),
  }),
  fileFilter: (_req, file, cb) => {
    if (!MIME_TO_EXT[file.mimetype]) {
      cb(new Error("Only JPEG, PNG, WebP, GIF, or HEIC images are allowed"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router: IRouter = Router();

router.use("/uploads", express.static(uploadsDir, { maxAge: "7d", immutable: true }));

router.post("/uploads", (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      const message =
        err instanceof MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Photo is too large (max 10MB)"
          : err.message || "Failed to upload photo";
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No photo provided" });
      return;
    }
    res.status(201).json({ url: `/api/uploads/${req.file.filename}` });
  });
});

export default router;
