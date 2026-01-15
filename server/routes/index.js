import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..", "..");

router.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

export default router;

