import axios from 'axios';

async function test() {
  const apiKey = 'ark-c620c6ed-00c9-4abc-948c-cbe335d9d4c2-65f9d';
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  
  // Create a dummy 1x1 image
  const imgBase64 = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64').toString('base64');
  const dataUrl = `data:image/jpeg;base64,${imgBase64}`;

  try {
    const res = await axios.post(`${baseUrl}/contents/generations/tasks`, {
      model: 'doubao-seedance-2-0-260128',
      content: [
        {
          type: 'text',
          text: 'A simple test video'
        },
        {
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Success:', res.data);
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();