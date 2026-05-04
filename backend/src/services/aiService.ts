import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

export const extractFramesAndTag = async (file: any, frameRate: number) => {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(__dirname, '../../..', file.storage_path);
    const outDir = path.join(__dirname, '../../../uploads/frames', file.id);
    
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Use FFmpeg to extract frames
    ffmpeg(inputPath)
      .outputOptions([`-vf fps=${frameRate}`])
      .save(path.join(outDir, 'frame-%04d.jpg'))
      .on('end', () => {
        const files = fs.readdirSync(outDir);
        const frames: { id: string; path: string }[] = [];
        const allTags = new Set<string>();

        const mockTags = ['people', 'car', 'building', 'nature', 'animal'];

        files.forEach((f, i) => {
          const frameId = uuidv4();
          const p = `uploads/frames/${file.id}/${f}`;
          
          db.prepare(`
            INSERT INTO extracted_frames (id, video_id, frame_number, storage_path)
            VALUES (?, ?, ?, ?)
          `).run(frameId, file.id, i + 1, p);

          // Mock AI Tagging
          const tag = mockTags[i % mockTags.length];
          allTags.add(tag);

          db.prepare(`
            INSERT INTO ai_tags (id, frame_id, tag_name, confidence)
            VALUES (?, ?, ?, ?)
          `).run(uuidv4(), frameId, tag, 0.95);

          // Mock Vector Embedding
          db.prepare(`
            INSERT INTO vector_data (id, frame_id, embedding)
            VALUES (?, ?, ?)
          `).run(uuidv4(), frameId, JSON.stringify([Math.random(), Math.random(), Math.random()]));

          frames.push({ id: frameId, path: p });
        });

        resolve({
          frames,
          tags: Array.from(allTags)
        });
      })
      .on('error', (err) => reject(err));
  });
};

export const vectorSearch = async (query: string, limit: number) => {
  // Mock Vector Search Implementation returning BOTH images and videos
  // In a real app, this would query Milvus or PgVector
  const frames = db.prepare(`
    SELECT ef.id, ef.storage_path, at.tag_name 
    FROM extracted_frames ef
    LEFT JOIN ai_tags at ON ef.id = at.frame_id
    LIMIT ?
  `).all(limit);

  const videos = db.prepare(`
    SELECT id, storage_path, original_name as tag_name
    FROM upload_files
    WHERE file_type = 'video'
    LIMIT ?
  `).all(limit);

  const results: any[] = [];
  
  frames.forEach((f: any) => {
    results.push({
      id: f.id,
      path: f.storage_path,
      tag: f.tag_name,
      type: 'image',
      similarity: 0.85 + (Math.random() * 0.1)
    });
  });

  videos.forEach((v: any) => {
    results.push({
      id: v.id,
      path: v.storage_path,
      tag: v.tag_name,
      type: 'video',
      similarity: 0.75 + (Math.random() * 0.2)
    });
  });

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, limit);
};

export const generateVideo = async (taskId: string, referenceFrames: string[], prompt: string, model: string, duration: number, tagSequence: string) => {
  return new Promise((resolve, reject) => {
    const resultPath = `uploads/output/generated-${taskId}.mp4`;
    const outPath = path.join(__dirname, '../../..', resultPath);
    const outDir = path.dirname(outPath);
    
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 既然当前环境不支持 lavfi (Input format lavfi is not available)，
    // 我们通过生成一张 1x1 的纯黑 JPEG 图片，然后利用 ffmpeg -loop 1 读取它来生成符合 QuickTime 兼容要求的黑屏视频。
    const tempImgPath = path.join(outDir, `temp_blank_${taskId}.jpg`);
    const blankJpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    fs.writeFileSync(tempImgPath, blankJpeg);

    ffmpeg()
      .input(tempImgPath)
      .inputOptions(['-loop 1']) // 循环读取单张图片
      .duration(duration || 3)
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p', 
        '-movflags +faststart',
        '-s 1280x720' // 强制放大到 720p 以满足正常的视频尺寸
      ])
      .on('end', () => {
        if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath); // 清理临时图片
        db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', JSON.stringify({ outputPath: resultPath, prompt, model, tagSequence, referenceCount: referenceFrames.length }), taskId);
        resolve(resultPath);
      })
      .on('error', (err) => {
        console.error('Error generating AI video:', err);
        if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath); // 清理临时图片
        db.prepare('UPDATE process_tasks SET status = ? WHERE id = ?').run('failed', taskId);
        reject(err);
      })
      .save(outPath);
  });
};
