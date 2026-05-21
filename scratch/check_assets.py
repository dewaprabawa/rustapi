import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("DATABASE_URL")
client = pymongo.MongoClient(uri)
db = client["rustapi"]
col = db["assets"]

print("Connecting to database:", uri.split("@")[-1])
total = col.count_documents({})
print("Total assets in DB:", total)

for a in col.find().limit(10):
    print({
        "id": str(a.get("_id")),
        "filename": a.get("filename"),
        "asset_type": a.get("asset_type"),
        "public_url": a.get("public_url")
    })
