const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://dewas2026:BpYSmzZhJ8EKVqVs@cluster0.ofnyeuk.mongodb.net/?appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db("rustapi");
    console.log("Dropping database 'rustapi'...");
    await db.dropDatabase();
    console.log("✅ Database 'rustapi' has been dropped.");
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
