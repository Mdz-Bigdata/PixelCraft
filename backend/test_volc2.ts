import axios from 'axios';
import fs from 'fs';

async function test() {
  const apiKey = 'ark-c620c6ed-00c9-4abc-948c-cbe335d9d4c2-65f9d';
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  
  // Read actual image
  const imgBuffer = fs.readFileSync('../tests/data/extracted_img_0.jpeg');
  const imgBase64 = imgBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${imgBase64}`;

  try {
    const res = await axios.post(`${baseUrl}/contents/generations/tasks`, {
      model: 'doubao-seedance-2-0-260128',
      content: [
        {
          type: 'text',
          text: 'A person holding a coffee cup, cartoon style, energetic voiceover'
        },
        {
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        }
      ],
      generate_audio: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Success:', res.data);
    const taskId = res.data.id;

    // Poll
    let status = 'running';
    while (status === 'running' || status === 'queued') {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await axios.get(`${baseUrl}/contents/generations/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      status = pollRes.data.status;
      console.log('Poll status:', status);
      if (status === 'succeeded') {
        console.log('Result:', JSON.stringify(pollRes.data, null, 2));
      } else if (status === 'failed') {
        console.error('Failed:', pollRes.data.error);
      }
    }
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();