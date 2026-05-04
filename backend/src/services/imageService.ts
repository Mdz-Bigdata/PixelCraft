import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import db from '../db';

export const processImage = async (taskId: string, file: any, params: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const inputPath = path.join(__dirname, '../../..', file.storage_path);
      const ext = path.extname(file.original_name);
      const outName = `img-${taskId}${ext}`;
      const outDir = path.join(__dirname, '../../../uploads/output');
      
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      
      const outputPath = path.join(outDir, outName);
      const dbPath = `uploads/output/${outName}`;

      db.prepare('UPDATE process_tasks SET progress = ? WHERE id = ?').run(50, taskId);

      const width = params.width ? parseInt(params.width) : undefined;
      const height = params.height ? parseInt(params.height) : undefined;

      await sharp(inputPath)
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .toFile(outputPath);

      db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('completed', JSON.stringify({ outputPath: dbPath }), taskId);
      resolve(dbPath);
    } catch (err) {
      console.error('Sharp Error:', err);
      db.prepare('UPDATE process_tasks SET status = ? WHERE id = ?').run('failed', taskId);
      reject(err);
    }
  });
};
