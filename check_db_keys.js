
const { MongoClient } = require('mongodb');

async function checkConfig() {
  const uri = "mongodb+srv://dewas2026:BpYSmzZhJ8EKVqVs@cluster0.ofnyeuk.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("rustapi");
    const config = await db.collection("voice_configs").findOne({});
    console.log("Voice Config:", JSON.stringify(config, null, 2));
    
    const keys = await db.collection("api_keys").find({}).toArray();
    console.log("API Keys in DB:", JSON.stringify(keys.map(k => ({ provider: k.provider, active: k.active })), null, 2));
  } finally {
    await client.close();
  }
}

checkConfig();
