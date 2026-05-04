import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import db from '../db';
import AdmZip from 'adm-zip';

const getDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
};

export const processMedia = async (taskId: string, file: any, operation: string, params: any) => {
  const inputPath = path.join(__dirname, '../../..', file.storage_path);
  const outDir = path.join(__dirname, '../../../uploads/output');
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const duration = await getDuration(inputPath).catch(() => 10); // fallback 10s
  
  return new Promise(async (resolve, reject) => {
    if (operation === 'compress' && params.splitCondition) {
      // Mock splitting based on keywords. We split into 3 segments of 3 seconds each (or less if video is shorter)
      const numClips = 3;
      const clipDuration = Math.min(3, duration / numClips);
      
      const zip = new AdmZip();
      const zipName = `${taskId}_compressed_clips.zip`;
      const zipPath = path.join(outDir, zipName);
      
      const processClip = (index: number): Promise<void> => {
        return new Promise((res, rej) => {
          const clipName = `${taskId}_clip_${index}.mp4`;
          const clipPath = path.join(outDir, clipName);
          ffmpeg(inputPath)
            .setStartTime(index * clipDuration)
            .setDuration(clipDuration)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions(['-pix_fmt yuv420p', '-movflags +faststart'])
            .size('50%')
            .on('end', () => {
              zip.addLocalFile(clipPath);
              fs.unlinkSync(clipPath); // clean up temp clip
              res();
            })
            .on('error', rej)
            .save(clipPath);
        });
      };

      try {
        for (let i = 0; i < numClips; i++) {
          await processClip(i);
          db.prepare('UPDATE process_tasks SET progress = ? WHERE id = ?').run(Math.floor(((i+1)/numClips)*90), taskId);
        }
        zip.writeZip(zipPath);
        
        const dbPath = `uploads/output/${zipName}`;
        db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', JSON.stringify({ outputPath: dbPath }), taskId);
        resolve(dbPath);
      } catch (err) {
        db.prepare('UPDATE process_tasks SET status = ? WHERE id = ?').run('failed', taskId);
        reject(err);
      }
      return;
    }

    if (operation === 'extract_frames') {
      const zip = new AdmZip();
      const zipName = `${taskId}_frames.zip`;
      const zipPath = path.join(outDir, zipName);
      const framesDir = path.join(outDir, `frames_${taskId}`);
      
      if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

      ffmpeg(inputPath)
        .output(path.join(framesDir, 'frame_%03d.jpg'))
        .outputOptions(['-vf', 'fps=1']) // extract 1 frame per second
        .on('progress', (progress) => {
          if (progress.percent) {
            db.prepare('UPDATE process_tasks SET progress = ? WHERE id = ?').run(progress.percent * 0.9, taskId);
          }
        })
        .on('end', () => {
          const files = fs.readdirSync(framesDir);
          files.forEach(f => zip.addLocalFile(path.join(framesDir, f)));
          zip.writeZip(zipPath);
          fs.rmSync(framesDir, { recursive: true, force: true });
          
          const dbPath = `uploads/output/${zipName}`;
          db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run('completed', JSON.stringify({ outputPath: dbPath }), taskId);
          resolve(dbPath);
        })
        .on('error', (err) => {
          db.prepare('UPDATE process_tasks SET status = ? WHERE id = ?').run('failed', taskId);
          reject(err);
        })
        .run();
      return;
    }

    if (operation === 'smart-scale') {
      // split and smart crop
      const numClips = 2;
      const clipDuration = Math.min(4, duration / numClips);
      
      const zip = new AdmZip();
      const zipName = `${taskId}_smart_scale_clips.zip`;
      const zipPath = path.join(outDir, zipName);

      // Determine crop filter based on aspect ratio
      const ar = params.aspectRatio || '16:9';
      let vfFilter = '';
      if (ar === '16:9') {
        vfFilter = 'crop=ih*16/9:ih'; // This might fail if original is narrower. Let's use a safe padding/cropping.
        // A safer way is to scale and pad: scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2
        vfFilter = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080';
      } else if (ar === '9:16') {
        vfFilter = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
      } else if (ar === '1:1') {
        vfFilter = 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080';
      } else if (ar === '4:3') {
        vfFilter = 'scale=1440:1080:force_original_aspect_ratio=increase,crop=1440:1080';
      } else {
        vfFilter = 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720';
      }
      
      const processClip = (index: number): Promise<void> => {
        return new Promise((res, rej) => {
          const clipName = `${taskId}_smart_${index}.mp4`;
          const clipPath = path.join(outDir, clipName);
          ffmpeg(inputPath)
            .setStartTime(index * clipDuration)
            .setDuration(clipDuration)
            .videoFilters(vfFilter)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions(['-pix_fmt yuv420p', '-movflags +faststart'])
            .on('end', () => {
              zip.addLocalFile(clipPath);
              fs.unlinkSync(clipPath);
              res();
            })
            .on('error', rej)
            .save(clipPath);
        });
      };

      try {
        for (let i = 0; i < numClips; i++) {
          await processClip(i);
          db.prepare('UPDATE process_tasks SET progress = ? WHERE id = ?').run(Math.floor(((i+1)/numClips)*90), taskId);
        }
        zip.writeZip(zipPath);
        
        const dbPath = `uploads/output/${zipName}`;
        db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', JSON.stringify({ outputPath: dbPath }), taskId);
        resolve(dbPath);
      } catch (err) {
        console.error('Smart Scale Error:', err);
        db.prepare('UPDATE process_tasks SET status = ? WHERE id = ?').run('failed', taskId);
        reject(err);
      }
      return;
    }

    // Default operations
    const ext = path.extname(file.original_name);
    const outName = `${taskId}${ext}`;
    const outputPath = path.join(outDir, outName);
    const dbPath = `uploads/output/${outName}`;

    let command = ffmpeg(inputPath);

    if (operation === 'compress') {
      command = command.videoCodec('libx264').audioCodec('aac').outputOptions(['-pix_fmt yuv420p', '-movflags +faststart']).size('50%');
    } else if (operation === 'resize') {
      const w = params.width || 1280;
      const h = params.height || 720;
      command = command.size(`${w}x${h}`);
    }

    command
      .on('progress', (progress) => {
        if (progress.percent) {
          db.prepare('UPDATE process_tasks SET progress = ? WHERE id = ?').run(progress.percent, taskId);
        }
      })
      .on('end', () => {
        db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', JSON.stringify({ outputPath: dbPath }), taskId);
        resolve(dbPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg Error:', err);
        db.prepare('UPDATE process_tasks SET status = ? WHERE id = ?').run('failed', taskId);
        reject(err);
      })
      .save(outputPath);
  });
};
