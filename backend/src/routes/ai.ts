import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { extractFramesAndTag, vectorSearch, generateVideo } from '../services/aiService';

const router = Router();

router.post('/extract-frames', async (req, res) => {
  try {
    const { videoId, frameRate = 1 } = req.body;
    const file = db.prepare('SELECT * FROM upload_files WHERE id = ?').get(videoId) as any;
    
    if (!file) return res.status(404).json({ error: 'Video not found' });

    // Mock async extraction for demonstration, or do it inline
    const result = await extractFramesAndTag(file, frameRate);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

router.post('/vector-search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    const results = await vectorSearch(query, limit);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/generate-video', async (req, res) => {
  try {
    const { referenceFrames, prompt, model = 'seedance2.0', duration = 10, tagSequence = '' } = req.body;
    
    const taskId = uuidv4();
    const userId = 'user-123'; // Mock user
    
    db.prepare(`
      INSERT INTO process_tasks (id, user_id, file_id, task_type, parameters, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(taskId, userId, 'dummy-file-id', 'generate-video', JSON.stringify({ prompt, model, duration, tagSequence }), 'processing');

    // Async generation
    generateVideo(taskId, referenceFrames, prompt, model, duration, tagSequence).catch(console.error);

    res.json({
      taskId,
      estimatedTime: duration * 2
    });
  } catch (error) {
    res.status(500).json({ error: 'Video generation failed' });
  }
});

export default router;
