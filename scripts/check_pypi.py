import json
import urllib.request
import re
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
req_file = os.path.join(PROJECT_ROOT, "backend", "requirements.txt")
outdated = {}

if not os.path.exists(req_file):
    print(f"Error: {req_file} not found.")
    exit(1)

with open(req_file, "r") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([a-zA-Z0-9_\-]+)==([a-zA-Z0-9\.\-]+)", line)
        if match:
            pkg, ver = match.groups()
            try:
                url = f"https://pypi.org/pypi/{pkg}/json"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode())
                    latest = data["info"]["version"]
                    outdated[pkg] = {
                        "current": ver,
                        "latest": latest,
                        "is_outdated": ver != latest
                    }
            except Exception as e:
                outdated[pkg] = {
                    "current": ver,
                    "latest": "Error / Unknown",
                    "is_outdated": False,
                    "error": str(e)
                }

print(json.dumps(outdated, indent=2))
