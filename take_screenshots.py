import subprocess, time, socket, os, sys, json
import urllib.request
from playwright.sync_api import sync_playwright

PROJECT_DIR = r"c:\Users\geori\OneDrive\Documentos\projects\my-first-project\vanguard-clothier-erp"
OUT_DIR = r"c:\Users\geori\OneDrive\Documentos\projects\my-first-project\screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

def is_port_open(port):
    try:
        with socket.create_connection(("localhost", port), timeout=1):
            return True
    except OSError:
        return False

def wait_for_port(port, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        if is_port_open(port):
            return True
        time.sleep(1)
    return False

def api_login(retries=5, delay=3):
    payload = json.dumps({"email": "admin@vanguard.com", "password": "admin123"}).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                "http://localhost:3000/api/auth/login",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read()).get("token")
        except Exception as e:
            print(f"  Попытка {attempt+1}/{retries}: {e}")
            if attempt < retries - 1:
                time.sleep(delay)
    return None

proc = None
if is_port_open(3000):
    print("Сервер уже запущен на порту 3000.")
else:
    print("Запуск сервера...")
    proc = subprocess.Popen(
        ["npx", "tsx", "server.ts"],
        cwd=PROJECT_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
    )
    if not wait_for_port(3000, 60):
        proc.kill()
        sys.exit("Сервер не запустился!")
    print("Сервер запущен. Жду 4 сек...")
    time.sleep(4)

print("Получаю JWT токен...")
token = api_login()
if not token:
    if proc: proc.kill()
    sys.exit("Не удалось получить токен!")
print(f"  OK: {token[:25]}...")

# Sidebar indices for ADMIN:
# 0=dashboard, 1=catalog, 2=pos, 3=crm, 4=orders,
# 5=inventory, 6=supplies, 7=brands, 8=warehouse, 9=finances, 10=analytics, 11=settings
TABS = [
    (0,  "dashboard",  "Dashboard"),
    (5,  "inventory",  "Склад"),
    (2,  "pos",        "POS-касса"),
    (4,  "orders",     "Заказы"),
    (3,  "crm",        "CRM"),
    (9,  "finances",   "Финансы"),
    (10, "analytics",  "Аналитика"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── ERP screenshots ──
    ctx = browser.new_context(viewport={"width": 1440, "height": 820})
    page = ctx.new_page()

    page.goto("http://localhost:3000", wait_until="domcontentloaded")
    page.evaluate(f"localStorage.setItem('token', '{token}')")
    page.reload(wait_until="networkidle")
    time.sleep(4)
    print(f"  Страница: {page.title()}")

    for idx, name, label in TABS:
        print(f"  Снимок [{idx}]: {label}...")
        try:
            buttons = page.query_selector_all("aside nav button")
            print(f"    Кнопок: {len(buttons)}")
            if idx < len(buttons):
                buttons[idx].click()
                time.sleep(2)
            path = os.path.join(OUT_DIR, f"{name}.png")
            page.screenshot(path=path)
            print(f"    OK: {os.path.getsize(path):,} байт")
        except Exception as e:
            print(f"    Ошибка: {e}")

    ctx.close()

    # ── Storefront screenshot ──
    print("  Снимок: Витрина...")
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 820})
    page2 = ctx2.new_page()
    page2.goto("http://localhost:3000", wait_until="networkidle")
    time.sleep(3)
    page2.screenshot(path=os.path.join(OUT_DIR, "storefront.png"))
    print(f"    OK: {os.path.getsize(os.path.join(OUT_DIR, 'storefront.png')):,} байт")
    ctx2.close()

    browser.close()

if proc:
    proc.kill()
print("\nГотово! Скриншоты в:", OUT_DIR)
