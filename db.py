import pyodbc
import os
import json

# Database configuration
# Supports both localhost\SQLEXPRESS (default) and remote 192.168.1.253
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'db_config.json')

DEFAULT_CONFIG = {
    "server": "localhost\\SQLEXPRESS",
    "database": "SystemTracabilie",
    "trusted_connection": "yes",
    "username": "",
    "password": "",
    "driver": "ODBC Driver 17 for SQL Server",
    "remote_server": "192.168.1.253"
}

def get_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                return {**DEFAULT_CONFIG, **cfg}
        except Exception:
            return DEFAULT_CONFIG
    return DEFAULT_CONFIG

def get_connection():
    cfg = get_config()
    server = cfg.get("server", "localhost\\SQLEXPRESS")
    database = cfg.get("database", "SystemTracabilie")
    driver = cfg.get("driver", "ODBC Driver 17 for SQL Server")
    trusted = cfg.get("trusted_connection", "yes").lower() in ("yes", "true", "1")
    user = cfg.get("username", "")
    password = cfg.get("password", "")

    if trusted:
        conn_str = f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};Trusted_Connection=yes;TrustServerCertificate=yes;"
    else:
        conn_str = f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};UID={user};PWD={password};TrustServerCertificate=yes;"

    return pyodbc.connect(conn_str)

