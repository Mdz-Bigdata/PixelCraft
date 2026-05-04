import axios from 'axios';
async function test() {
  const res = await axios.post('https://api.deepseek.com/chat/completions', {
    model: 'deepseek-chat',
    messages: [{role: 'user', content: 'hello'}]
  }, {
    headers: { 'Authorization': 'Bearer sk-68309880264b48f9b031d59af77a056a' }
  });
  console.log(res.data);
}
test();
