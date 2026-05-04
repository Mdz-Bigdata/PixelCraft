import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import db from '../db';

const router = Router();

// Try to add selected_model column if it doesn't exist
try {
  db.prepare("ALTER TABLE providers ADD COLUMN selected_model TEXT").run();
} catch (e) {
  // column already exists
}

// Get all providers
router.get('/', (req, res) => {
  try {
    const providers = db.prepare('SELECT id, name, base_url, api_key, enabled, selected_model, created_at FROM providers ORDER BY created_at DESC').all();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Test provider connectivity
router.post('/test', async (req, res) => {
  const { name, base_url, api_key } = req.body;
  if (!name || !base_url || !api_key) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // We can just use a dummy id for testing
  const id = name.toLowerCase().replace(/\s+/g, '-');
  
  try {
    const pythonRes = await axios.post('http://127.0.0.1:8000/api/models/test-connectivity', {
      provider_id: id,
      api_key,
      base_url
    });
    
    res.json({ status: 'success', message: pythonRes.data.message });
  } catch (pyErr: any) {
    console.error('Python service test error:', pyErr.message);
    res.status(400).json({ error: pyErr.response?.data?.detail || 'Connection test failed' });
  }
});

// Add or update provider
router.post('/', async (req, res) => {
  const { category, name, base_url, api_key, selected_model } = req.body;
  if (!category || !name || !base_url || !api_key) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = category; // 'text', 'image', or 'video'
  
  try {
    db.prepare(`
      INSERT INTO providers (id, name, base_url, api_key, selected_model)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, base_url=excluded.base_url, api_key=excluded.api_key, selected_model=excluded.selected_model
    `).run(id, name, base_url, api_key, selected_model || null);

    // Call python service to fetch and sync models
    try {
      const pythonRes = await axios.post('http://127.0.0.1:8000/api/models/fetch', {
        provider_id: id, // Pass category as provider_id to Python so we get it back
        api_key,
        base_url
      });
      
      const models = pythonRes.data.models;
      if (models && models.length > 0) {
        // Clear old models for this provider (category)
        db.prepare('DELETE FROM models WHERE provider_id = ?').run(id);
        
        // Insert new models
        const insertModel = db.prepare(`
          INSERT INTO models (id, provider_id, model_name, category)
          VALUES (?, ?, ?, ?)
        `);
        
        const insertMany = db.transaction((modelsToInsert: any[]) => {
          for (const m of modelsToInsert) {
            const modelId = `${id}-${m.id}`;
            insertModel.run(modelId, id, m.model_name, m.category);
          }
        });
        
        insertMany(models);
      }
      
      res.json({ status: 'success', syncedModelsCount: models.length });
    } catch (pyErr: any) {
      console.error('Python service error:', pyErr.message);
      res.status(500).json({ error: 'Provider saved, but failed to fetch models from provider' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save provider' });
  }
});

// Get all synced models grouped by category
router.get('/models', (req, res) => {
  try {
    // Note: models table has 'provider_id' which is now 'text', 'image', or 'video'
    // We only return models that match their provider_id category to ensure isolation.
    const models = db.prepare(`
      SELECT m.id, m.model_name, m.category, p.name as provider_name, m.provider_id
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE p.enabled = 1 AND m.category = m.provider_id
      ORDER BY p.name, m.model_name
    `).all();
    
    // Group by category
    const grouped = {
      text: models.filter((m: any) => m.category === 'text'),
      image: models.filter((m: any) => m.category === 'image'),
      video: models.filter((m: any) => m.category === 'video'),
      audio: models.filter((m: any) => m.category === 'audio'),
    };
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

export default router;
