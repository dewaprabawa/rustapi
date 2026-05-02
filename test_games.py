import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    req = urllib.request.Request("http://localhost:3000/api/lessons")
    with urllib.request.urlopen(req, context=ctx) as response:
        lessons = json.loads(response.read().decode())
        lesson_id = next((l for l in lessons if l["title"] == "Greeting & Welcoming"), None)
        if lesson_id:
            id_val = lesson_id["id"]
            if isinstance(id_val, dict): id_val = id_val["$oid"]
            req2 = urllib.request.Request(f"http://localhost:3000/api/lessons/{id_val}/games")
            with urllib.request.urlopen(req2, context=ctx) as r2:
                games = json.loads(r2.read().decode())
                print(f"Games found: {len(games)}")
                for g in games:
                    print(f" - {g.get('title')} ({g.get('game_type')}) [active: {g.get('is_active')}]")
        else:
            print("Lesson not found")
except Exception as e:
    print(f"Error: {e}")
