const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('rustapi');
  await db.collection('storage_configs').updateOne({}, { $set: { active_provider: 'supabase' } });
  console.log('Fixed storage provider!');
  await client.close();
}

run().catch(console.error);
