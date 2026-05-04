import * as googleTTS from 'google-tts-api';
import fs from 'fs';

async function test() {
  const base64 = await googleTTS.getAudioBase64('这是一个AI生成的广告配音测试', {
    lang: 'zh-CN',
    slow: false,
    host: 'https://translate.google.com',
  });
  fs.writeFileSync('../tests/data/test_tts.mp3', Buffer.from(base64, 'base64'));
  console.log('Saved to ../tests/data/test_tts.mp3');
}
test();
