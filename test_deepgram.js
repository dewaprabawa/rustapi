
const axios = require('axios');

async function testDeepgram() {
  const key = "1bc35c2f3a3e4f4d63ef1d887040bbda657ba123";
  try {
    const res = await axios.get('https://api.deepgram.com/v1/projects', {
      headers: { 'Authorization': `Token ${key}` }
    });
    console.log("Deepgram Key is VALID:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Deepgram Key is INVALID:", err.response?.status, err.response?.data);
  }
}

testDeepgram();
