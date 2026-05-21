const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read database url from .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match) {
  console.error("Could not find DATABASE_URL in .env");
  process.exit(1);
}
const uri = match[1];

async function main() {
  console.log("Connecting to:", uri.split('@').pop());
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('rustapi');
    const col = db.collection('assets');
    const count = await col.countDocuments({});
    console.log("Total assets:", count);
    const docs = await col.find({}).limit(20).toArray();
    console.log("Sample documents:");
    console.log(JSON.stringify(docs, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
main();
