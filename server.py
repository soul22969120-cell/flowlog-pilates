import json
import os
import sqlite3
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("FLOWLOG_DB_PATH", ROOT / "pilates.sqlite3"))
PORT = int(os.environ.get("PORT", "4173"))
OPEN_TIMES = {"09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "19:00"}
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def using_supabase():
    return bool(SUPABASE_URL and SUPABASE_KEY)


def supabase_request(method, path, payload=None, query=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if query:
        url += "?" + urlencode(query)
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    raw_body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=raw_body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=15) as response:
            raw = response.read()
            return json.loads(raw) if raw else []
    except HTTPError as error:
        if error.code in (409, 412):
            raise sqlite3.IntegrityError from error
        raise RuntimeError from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError from error


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_date TEXT NOT NULL,
            booking_time TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT '已預約',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(booking_date, booking_time)
        )""")


def booking_json(row):
    target = date.fromisoformat(row["booking_date"])
    today = date.today()
    return {"id": row["id"], "offset": (target - today).days, "time": row["booking_time"],
            "name": row["name"], "phone": "", "status": row["status"]}


class Handler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self.send_json({"ok": True})
        if path == "/api/bookings":
            if using_supabase():
                try:
                    rows = supabase_request("GET", "bookings", query={
                        "select": "*",
                        "order": "booking_date.asc,booking_time.asc",
                    })
                except RuntimeError:
                    return self.send_json({"error": "資料庫連線失敗，請稍後再試"}, 503)
                today = date.today()
                rows = [row for row in rows if date.fromisoformat(row["booking_date"]) >= today]
                return self.send_json([booking_json(row) for row in rows])
            with db() as conn:
                rows = conn.execute("SELECT * FROM bookings WHERE booking_date >= date('now') ORDER BY booking_date, booking_time").fetchall()
            return self.send_json([booking_json(row) for row in rows])
        return self.static_file(path)

    def do_POST(self):
        if urlparse(self.path).path != "/api/bookings":
            return self.send_json({"error": "找不到 API"}, 404)
        body = self.read_json()
        try:
            target = date.fromisoformat(body["date"])
            booking_time = body["time"]
            name = str(body["name"]).strip()
            if not name or booking_time not in OPEN_TIMES:
                raise ValueError
            if not 0 <= (target - date.today()).days <= 90:
                return self.send_json({"error": "目前只開放未來 90 天"}, 400)
            if using_supabase():
                rows = supabase_request("POST", "bookings", {
                    "booking_date": target.isoformat(),
                    "booking_time": booking_time,
                    "name": name,
                })
                return self.send_json(booking_json(rows[0]), 201)
            with db() as conn:
                cur = conn.execute("INSERT INTO bookings (booking_date, booking_time, name) VALUES (?, ?, ?)", (target.isoformat(), booking_time, name))
                row = conn.execute("SELECT * FROM bookings WHERE id = ?", (cur.lastrowid,)).fetchone()
            return self.send_json(booking_json(row), 201)
        except sqlite3.IntegrityError:
            return self.send_json({"error": "這個時段剛剛已被預約"}, 409)
        except RuntimeError:
            return self.send_json({"error": "資料庫連線失敗，請稍後再試"}, 503)
        except (KeyError, ValueError, TypeError):
            return self.send_json({"error": "請確認日期、時間與姓名"}, 400)

    def do_DELETE(self):
        parts = urlparse(self.path).path.rstrip("/").split("/")
        if len(parts) != 4 or parts[:3] != ["", "api", "bookings"]:
            return self.send_json({"error": "找不到 API"}, 404)
        try:
            booking_id = int(parts[3])
        except ValueError:
            return self.send_json({"error": "預約編號無效"}, 400)
        if using_supabase():
            try:
                supabase_request("DELETE", "bookings", query={"id": f"eq.{booking_id}"})
            except RuntimeError:
                return self.send_json({"error": "資料庫連線失敗，請稍後再試"}, 503)
            return self.send_json({"ok": True})
        with db() as conn:
            conn.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
        return self.send_json({"ok": True})

    def static_file(self, path):
        relative = "pilates-studio.html" if path in ("", "/") else "admin.html" if path in ("/admin", "/admin/") else path.lstrip("/")
        target = (ROOT / relative).resolve()
        if ROOT not in target.parents and target != ROOT:
            return self.send_json({"error": "找不到頁面"}, 404)
        if not target.is_file():
            return self.send_json({"error": "找不到頁面"}, 404)
        content_type = "text/html; charset=utf-8" if target.suffix == ".html" else "application/octet-stream"
        raw = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    init_db()
    print(f"FlowLog server: http://localhost:{PORT}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
