import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'image';
    if (file.mimetype.startsWith('video/')) folder = 'video';
    
    // Ensure directory exists
    const uploadDir = path.join(__dirname, `../../../uploads/${folder}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/', upload.array('files'), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Default mock user
    const userId = 'user-123';
    
    // Create user if not exists
    db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(userId, 'test@test.com', 'hash', 'Test User');

    const uploadIds: string[] = [];
    const insertFile = db.prepare(`
      INSERT INTO upload_files (id, user_id, original_name, file_type, mime_type, file_size, storage_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const file of files) {
      const id = uuidv4();
      const fileType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const storagePath = path.relative(path.join(__dirname, '../../..'), file.path);
      
      insertFile.run(id, userId, file.originalname, fileType, file.mimetype, file.size, storagePath);
      uploadIds.push(id);
    }

    res.json({
      uploadIds,
      status: 'success'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/files', (req, res) => {
  try {
    const files = db.prepare('SELECT * FROM upload_files ORDER BY created_at DESC').all();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

export default router;
