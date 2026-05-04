import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { processMedia } from '../services/ffmpegService';
import { processImage } from '../services/imageService';

import fs from 'fs';
import path from 'path';

const router = Router();

// Handle video processes
router.post('/video', async (req, res) => {
  try {
    const { uploadId, operation, params } = req.body;
    
    if (!uploadId || !operation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const file = db.prepare('SELECT * FROM upload_files WHERE id = ?').get(uploadId) as any;
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const taskId = uuidv4();
    const userId = file.user_id;

    db.prepare(`
      INSERT INTO process_tasks (id, user_id, file_id, task_type, parameters, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(taskId, userId, uploadId, operation, JSON.stringify(params || {}), 'processing');

    // Async process
    processMedia(taskId, file, operation, params).catch(console.error);

    res.json({
      taskId,
      status: 'processing',
      progress: 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start processing' });
  }
});

// Handle image processes
router.post('/image', async (req, res) => {
  try {
    const { uploadIds, operation, params } = req.body; // allow multiple uploadIds for batch
    
    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0 || !operation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const taskIds: string[] = [];

    for (const uploadId of uploadIds) {
      const file = db.prepare('SELECT * FROM upload_files WHERE id = ?').get(uploadId) as any;
      if (file) {
        const taskId = uuidv4();
        const userId = file.user_id;

        db.prepare(`
          INSERT INTO process_tasks (id, user_id, file_id, task_type, parameters, status, started_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(taskId, userId, uploadId, operation, JSON.stringify(params || {}), 'processing');

        // Async process
        processImage(taskId, file, params).catch(console.error);
        taskIds.push(taskId);
      }
    }

    res.json({
      taskIds,
      status: 'processing',
      progress: 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start processing' });
  }
});

router.get('/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM process_tasks ORDER BY created_at DESC').all();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/download/:id', (req, res) => {
  try {
    const taskId = req.params.id;
    const task = db.prepare('SELECT * FROM process_tasks WHERE id = ?').get(taskId) as any;
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({ error: 'Task is not completed yet' });
    }

    const result = JSON.parse(task.result || '{}');
    if (!result.outputPath) {
      return res.status(404).json({ error: 'Output file path not found in task result' });
    }

    const fullPath = path.resolve(__dirname, '../../..', result.outputPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File physically not found on server' });
    }

    // Attempt to parse original name to give downloaded file a nice name
    let downloadName = 'processed_file' + path.extname(fullPath);
    try {
      const file = db.prepare('SELECT original_name FROM upload_files WHERE id = ?').get(task.file_id) as any;
      if (file && file.original_name) {
        const ext = path.extname(fullPath); // Use output extension, not original extension
        const baseName = path.basename(file.original_name, path.extname(file.original_name));
        downloadName = `${baseName}_pixelcraft${ext}`;
      }
    } catch (e) {}

    res.download(fullPath, downloadName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });

  } catch (error) {
    console.error('Download route error:', error);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

router.delete('/tasks/:id', (req, res) => {
  try {
    const taskId = req.params.id;
    db.prepare('DELETE FROM process_tasks WHERE id = ?').run(taskId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
