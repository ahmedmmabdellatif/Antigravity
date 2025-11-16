import { Router } from 'express';
import multer from 'multer';
import { parseController } from '../controllers/parse.controller';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// POST /api/parse - Upload and parse PDF
router.post('/', upload.single('file'), (req, res) => {
  parseController.parsePdf(req, res);
});

export default router;
