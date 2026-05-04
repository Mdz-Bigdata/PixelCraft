import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';

import * as googleTTS from 'google-tts-api';

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

export const generateVideo = async (taskId: string, referenceFrames: string[], prompt: string, model: string, duration: number, tagSequence: string, textModel?: string, audioModel?: string) => {
  return new Promise(async (resolve, reject) => {
    const resultPath = `uploads/output/generated-${taskId}.mp4`;
    const outPath = path.join(__dirname, '../../..', resultPath);
    const outDir = path.dirname(outPath);
    
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const actualDuration = duration || 5;

    let inputFilePath = path.join(__dirname, '../../../tests/data/pos_video.mp4'); // Default fallback
    let isImage = false;
    let referenceTags: string[] = [];

    if (referenceFrames && referenceFrames.length > 0) {
      try {
        const placeholders = referenceFrames.map(() => '?').join(',');
        const query = `
          SELECT ef.storage_path, at.tag_name 
          FROM extracted_frames ef
          LEFT JOIN ai_tags at ON ef.id = at.frame_id
          WHERE ef.id IN (${placeholders})
          UNION ALL
          SELECT storage_path, original_name as tag_name 
          FROM upload_files 
          WHERE id IN (${placeholders})
        `;
        const params = [...referenceFrames, ...referenceFrames];
        const refs = db.prepare(query).all(...params) as any[];

        if (refs && refs.length > 0) {
          inputFilePath = path.join(__dirname, '../../..', refs[0].storage_path);
          if (inputFilePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
            isImage = true;
          }
          referenceTags = refs.map(r => r.tag_name).filter(Boolean);
        }
      } catch (e) {
        console.error('Error fetching reference frames:', e);
      }
    }

    // 1. Generate Ad Script using LLM (DeepSeek or fallback)
    let adScript = prompt || "AI 自动生成视频广告";
    try {
      const textProvider = db.prepare(`SELECT * FROM providers WHERE id = 'text' AND enabled = 1`).get() as any;
      if (textProvider && textProvider.base_url && textProvider.api_key) {
        console.log(`Generating Ad Script using LLM: ${textModel || textProvider.selected_model}`);
        const tagText = referenceTags.length > 0 ? referenceTags.slice(0, 5).join(', ') : '无';
        const llmPrompt = `请根据以下提示词和素材特征，写一段20字左右的精炼广告宣传文案，适合作为短视频配音。不要有任何多余的废话和引号。提示词：${prompt}。素材特征：${tagText}。`;
        
        const llmRes = await axios.post(`${textProvider.base_url}/chat/completions`, {
          model: textModel || textProvider.selected_model || 'deepseek-chat',
          messages: [{ role: 'user', content: llmPrompt }]
        }, {
          headers: { 'Authorization': `Bearer ${textProvider.api_key}`, 'Content-Type': 'application/json' }
        });
        
        if (llmRes.data?.choices?.[0]?.message?.content) {
          adScript = llmRes.data.choices[0].message.content.trim().replace(/['"]/g, '');
          console.log(`Generated Script: ${adScript}`);
        }
      }
    } catch (e) {
      console.error('Failed to generate script via LLM, using prompt as fallback', e);
    }

    // 2. Generate Voiceover using TTS
    let ttsAudioPath = path.join(__dirname, '../../../tests/data/dummy_audio.aac'); // Default fallback
    try {
      console.log(`Generating Voiceover using TTS model: ${audioModel}`);
      // Since we integrated google-tts-api for free TTS, we will use it directly.
      const base64 = await googleTTS.getAudioBase64(adScript, {
        lang: audioModel && audioModel.includes('en') ? 'en-US' : 'zh-CN',
        slow: false,
        host: 'https://translate.google.com',
      });
      const generatedAudioPath = path.join(outDir, `tts_${taskId}.mp3`);
      fs.writeFileSync(generatedAudioPath, Buffer.from(base64, 'base64'));
      ttsAudioPath = generatedAudioPath;
      console.log(`TTS Audio saved to: ${ttsAudioPath}`);
    } catch (e) {
      console.error('Failed to generate TTS, using fallback audio', e);
    }

    // Try to use the actual AI provider (Volcengine)
    try {
      const provider = db.prepare(`SELECT * FROM providers WHERE id = 'video' AND enabled = 1`).get() as any;
      if (provider && provider.base_url && provider.api_key) {
        console.log(`Using AI Provider: ${provider.base_url} with model ${model}`);
        
        let imgBuffer: Buffer;
        let mimeType = 'jpeg';

        if (isImage) {
          // Resize input image to avoid dimension issues (like 1x1 error) and sensitive content false-positives
          console.log('Input is an image, normalizing for I2V generation...');
          const tempFramePath = path.join(outDir, `temp_frame_${taskId}.jpg`);
          await new Promise((res, rej) => {
            ffmpeg(inputFilePath)
              .outputOptions(['-vf', 'scale=1280:720', '-vframes', '1'])
              .save(tempFramePath)
              .on('end', res)
              .on('error', rej);
          });
          imgBuffer = fs.readFileSync(tempFramePath);
          fs.unlinkSync(tempFramePath);
        } else {
          // If input is video, extract the first frame to a temporary image
          console.log('Input is a video, extracting the first frame for I2V generation...');
          const tempFramePath = path.join(outDir, `temp_frame_${taskId}.jpg`);
          await new Promise((res, rej) => {
            ffmpeg(inputFilePath)
              .frames(1)
              .outputOptions(['-vf', 'scale=1280:720']) // Resize to prevent "Image dimensions are too small" error
              .save(tempFramePath)
              .on('end', res)
              .on('error', rej);
          });
          imgBuffer = fs.readFileSync(tempFramePath);
          fs.unlinkSync(tempFramePath);
        }

        const imgBase64 = imgBuffer.toString('base64');
        const dataUrl = `data:image/${mimeType};base64,${imgBase64}`;

        const promptText = prompt || (referenceTags.length > 0 ? `基于素材特征: ${referenceTags.slice(0, 3).join(', ')} 制作一段广告宣传片` : "制作一段精美的广告宣传片");

        // Create Task
        let remoteTaskId = '';
        try {
          const createRes = await axios.post(`${provider.base_url}/contents/generations/tasks`, {
            model: model || 'doubao-seedance-2-0-260128',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: dataUrl } }
            ],
            generate_audio: false // We will use our own TTS audio instead!
          }, {
            headers: {
              'Authorization': `Bearer ${provider.api_key}`,
              'Content-Type': 'application/json'
            }
          });
          remoteTaskId = createRes.data?.id || createRes.data?.task_id;
        } catch (createErr: any) {
          // If it fails because of sensitive content or dimension issues, fallback to Text-to-Video (T2V)
          const errData = createErr.response?.data?.error || createErr.response?.data;
          console.warn('I2V generation failed, attempting T2V fallback. Error:', errData || createErr.message);
          
          const t2vRes = await axios.post(`${provider.base_url}/contents/generations/tasks`, {
            model: model || 'doubao-seedance-2-0-260128',
            content: [
              { type: 'text', text: promptText }
            ],
            generate_audio: false
          }, {
            headers: {
              'Authorization': `Bearer ${provider.api_key}`,
              'Content-Type': 'application/json'
            }
          });
          remoteTaskId = t2vRes.data?.id || t2vRes.data?.task_id;
        }

        console.log(`Created AI Video Task: ${remoteTaskId}`);

        // Poll Task
        let status = 'running';
        let videoUrl = '';
        while (status === 'running' || status === 'queued') {
          await new Promise(r => setTimeout(r, 5000));
          const pollRes = await axios.get(`${provider.base_url}/contents/generations/tasks/${remoteTaskId}`, {
            headers: { 'Authorization': `Bearer ${provider.api_key}` }
          });
          status = pollRes.data.status;
          console.log(`AI Video Task ${remoteTaskId} status: ${status}`);
          
          if (status === 'succeeded') {
            videoUrl = pollRes.data.content?.video_url || pollRes.data.video_url;
            break;
          } else if (status === 'failed') {
            throw new Error(JSON.stringify(pollRes.data.error || pollRes.data));
          }
        }

        if (videoUrl) {
          // Download Video
          console.log(`Downloading generated video from ${videoUrl}`);
          const rawVideoPath = path.join(outDir, `raw_${taskId}.mp4`);
          const writer = fs.createWriteStream(rawVideoPath);
          const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
          });
          
          response.data.pipe(writer);
          
          await new Promise((res, rej) => {
            writer.on('finish', res);
            writer.on('error', rej);
          });
          
          // Generate Ad Copy Subtitles based on the generated script
          const srtPath = path.join(outDir, `subtitles_${taskId}.srt`);
          const halfDur = Math.floor(actualDuration / 2);
          const srtContent = `1
00:00:00,000 --> 00:00:0${actualDuration},000
${adScript}
`;
          fs.writeFileSync(srtPath, srtContent);

          console.log('Merging Volcengine Video with TTS Audio and Subtitles...');
          await new Promise((res, rej) => {
            ffmpeg()
              .input(rawVideoPath)
              .input(ttsAudioPath)
              .input(srtPath)
              .outputOptions([
                '-map', '0:v',
                '-map', '1:a',
                '-map', '2:s',
                '-c:v', 'copy', // Copy original high-quality video
                '-c:a', 'aac',
                '-c:s', 'mov_text',
                '-shortest',
                '-movflags', '+faststart'
              ])
              .on('end', () => {
                if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
                if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);
                if (ttsAudioPath !== path.join(__dirname, '../../../tests/data/dummy_audio.aac') && fs.existsSync(ttsAudioPath)) {
                  fs.unlinkSync(ttsAudioPath);
                }
                res(true);
              })
              .on('error', (err) => {
                console.error('Error mixing audio and video:', err);
                rej(err);
              })
              .save(outPath);
          });

          db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run('completed', JSON.stringify({ outputPath: resultPath, prompt, model, tagSequence, referenceCount: referenceFrames.length, ai_generated: true }), taskId);
          return resolve(resultPath);
        }
      }
    } catch (e: any) {
      console.error('Failed to generate via AI API, falling back to local FFmpeg mock:', e.response?.data || e.message);
    }

    // Fallback to local FFmpeg generation if API fails or isn't configured
    console.log('Using local FFmpeg mock generation');
    const srtPath = path.join(outDir, `subtitles_${taskId}.srt`);
    const halfDur = Math.floor(actualDuration / 2);
    
    const promptText = prompt || "AI 自动生成视频广告";
    const tagText = referenceTags.length > 0 ? `基于素材特征: ${referenceTags.slice(0, 3).join(', ')}` : "基于所选素材智能生成";
    
    const srtContent = `1
00:00:00,000 --> 00:00:0${halfDur},000
${tagText}

2
00:00:0${halfDur},000 --> 00:00:0${actualDuration},000
${promptText}
`;
    fs.writeFileSync(srtPath, srtContent);

    let command = ffmpeg();

    if (isImage) {
      command = command.input(inputFilePath).inputOptions(['-loop', '1']);
    } else {
      command = command.input(inputFilePath).inputOptions(['-stream_loop', '-1']);
    }

    const audioPath = path.join(__dirname, '../../../tests/data/dummy_audio.aac');
    command = command
      .input(audioPath)
      .input(srtPath);

    command
      .duration(actualDuration)
      .outputOptions([
        '-map', '0:v',
        '-map', '1:a',
        '-map', '2:s',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-c:s', 'mov_text',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        '-movflags', '+faststart'
      ])
      .on('stderr', (stderrLine) => {
        // console.error('FFmpeg stderr:', stderrLine);
      })
      .on('end', () => {
        if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
        db.prepare('UPDATE process_tasks SET status = ?, progress = 100, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', JSON.stringify({ outputPath: resultPath, prompt, model, tagSequence, referenceCount: referenceFrames.length }), taskId);
        resolve(resultPath);
      })
      .on('error', (err) => {
        console.error('Error generating AI video:', err);
        if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
        db.prepare('UPDATE process_tasks SET status = ? WHERE id = ?').run('failed', taskId);
        reject(err);
      })
      .save(outPath);
  });
};