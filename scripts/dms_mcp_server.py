#!/usr/bin/env python3
# DMS-O2 Model Context Protocol (MCP) Server
# Exposes safe table schemas, Redis active session lists, and Meilisearch health to Antigravity.

import json
import sys
import os
import urllib.request

# Ensure stderr logging helper
def log(msg):
    sys.stderr.write(f"[DMS-MCP] {msg}\n")
    sys.stderr.flush()

# Load environment variables if available
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_file = os.path.join(PROJECT_ROOT, ".env")
env = {}
if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")

# --- TOOL IMPLEMENTATIONS ---

def inspect_database_schema(table_name=None):
    """Fetch structured table schema from Postgres container."""
    import subprocess
    db_user = env.get("POSTGRES_USER", "postgres")
    db_name = env.get("POSTGRES_DB", "postgres")
    
    # We construct the psql query to run inside the db container
    if table_name:
        query = (
            f"SELECT column_name, data_type, is_nullable, column_default "
            f"FROM information_schema.columns WHERE table_name = '{table_name}' ORDER BY ordinal_position;"
        )
    else:
        query = (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name;"
        )
        
    cmd = ["docker", "compose", "exec", "-T", "db", "psql", "-U", db_user, "-d", db_name, "-c", query]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True, cwd=PROJECT_ROOT)
        return res.stdout
    except Exception as e:
        return f"Error executing database schema query: {e}\nStderr: {getattr(e, 'stderr', '')}"

def check_meilisearch_health():
    """Verify Meilisearch REST API health status."""
    meili_host = env.get("MEILI_HOST", "http://localhost:7700")
    # Inside docker it might be http://meilisearch:7700, but from host we hit localhost:7700
    hosts_to_try = [meili_host.replace("meilisearch", "localhost"), "http://localhost:7700"]
    
    errors = []
    for host in hosts_to_try:
        try:
            req = urllib.request.Request(f"{host}/health")
            with urllib.request.urlopen(req, timeout=3) as res:
                return json.dumps(json.loads(res.read().decode()), indent=2)
        except Exception as e:
            errors.append(f"Host {host}: {e}")
    return "Failed to connect to Meilisearch:\n" + "\n".join(errors)

def query_active_sessions():
    """Scan Redis for active verification token hashes."""
    import subprocess
    cmd = ["docker", "compose", "exec", "-T", "redis", "redis-cli", "keys", "verify_token:*"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True, cwd=PROJECT_ROOT)
        keys = res.stdout.strip().split("\n")
        keys = [k for k in keys if k]
        return f"Active Verify-Token keys in Redis ({len(keys)}):\n" + "\n".join(keys)
    except Exception as e:
        return f"Error scanning Redis keys: {e}\nStderr: {getattr(e, 'stderr', '')}"

# --- JSON-RPC / MCP HANDLER LOOP ---

def main():
    log("Server starting...")
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            req = json.loads(line)
            method = req.get("method")
            req_id = req.get("id")
            
            # Initialize handshake
            if method == "initialize":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "serverInfo": {
                            "name": "dms-o2-mcp",
                            "version": "1.0.0"
                        }
                    }
                }
            
            # List Tools
            elif method == "tools/list":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": [
                            {
                                "name": "inspect_database_schema",
                                "description": "Fetches the public schema tables list, or columns of a specific database table.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "table_name": {
                                            "type": "string",
                                            "description": "Optional name of table to inspect details for."
                                        }
                                    }
                                }
                            },
                            {
                                "name": "check_meilisearch_health",
                                "description": "Checks the health status of the Meilisearch server.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {}
                                }
                            },
                            {
                                "name": "query_active_sessions",
                                "description": "Fetches all active verify-token hashes cached in Redis.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {}
                                }
                            }
                        ]
                    }
                }
            
            # Call Tools
            elif method == "tools/call":
                params = req.get("params", {})
                tool_name = params.get("name")
                arguments = params.get("arguments", {})
                
                log(f"Calling tool: {tool_name}")
                if tool_name == "inspect_database_schema":
                    content = inspect_database_schema(arguments.get("table_name"))
                elif tool_name == "check_meilisearch_health":
                    content = check_meilisearch_health()
                elif tool_name == "query_active_sessions":
                    content = query_active_sessions()
                else:
                    content = f"Unknown tool: {tool_name}"
                    
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": content
                            }
                        ]
                    }
                }
                
            else:
                # Default response for unhandled requests
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
                
            # Send back the JSON response on stdout
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()
            
        except Exception as e:
            log(f"Error in main loop: {e}")
            break

if __name__ == "__main__":
    main()
