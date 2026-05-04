import axios from 'axios';

async function test() {
  const apiKey = 'ark-c620c6ed-00c9-4abc-948c-cbe335d9d4c2-65f9d';
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';

  try {
    const res = await axios.post(`${baseUrl}/contents/generations/tasks`, {
      model: 'doubao-seedance-2-0-260128',
      content: [
        {
          type: 'text',
          text: 'A beautiful landscape with mountains and rivers, cinematic lighting'
        }
      ],
      generate_audio: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Success:', res.data);
    const taskId = res.data.id;
    let status = 'running';
    while(status === 'running' || status === 'queued') {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await axios.get(`${baseUrl}/contents/generations/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      status = pollRes.data.status;
      console.log('Status:', status);
      if (status === 'failed') {
        console.error('Failed:', pollRes.data.error);
      }
    }
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();