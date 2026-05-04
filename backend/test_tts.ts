import * as googleTTS from 'google-tts-api';
import fs from 'fs';

async function test() {
  const url = googleTTS.getAudioUrl('Hello world, this is an AI voiceover.', {
    lang: 'zh-CN',
    slow: false,
    host: 'https://translate.google.com',
  });
  console.log(url);
}
test();
