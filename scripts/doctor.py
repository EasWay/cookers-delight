#!/usr/bin/env python3
"""
Cookers Delight — Autonomous Self-Healing Agent
Tier 1: pattern matching, Tier 2: state analysis, Tier 3: Claude AI reasoning.
Usage: python3 scripts/doctor.py [--fix] [--ai] [--env dev|staging|prod]
"""

import subprocess, sys, os, json, re, time, urllib.request, shutil
from typing import Optional

# ─── colours ──────────────────────────────────────────────────────────────────
G='\033[92m'; Y='\033[93m'; R='\033[91m'; B='\033[94m'; BOLD='\033[1m'; NC='\033[0m'
def ok(m):   print(f"  {G}✓{NC}  {m}")
def warn(m): print(f"  {Y}⚠{NC}  {m}")
def err(m):  print(f"  {R}✗{NC}  {m}")
def fix(m):  print(f"  {B}→{NC}  FIXING: {m}")
def head(m): print(f"\n{BOLD}{m}{NC}")

# ─── parse args ───────────────────────────────────────────────────────────────
AUTO_FIX = '--fix' in sys.argv
USE_AI   = '--ai'  in sys.argv
ENV      = next((sys.argv[i+1] for i,a in enumerate(sys.argv)
                 if a == '--env' and i+1 < len(sys.argv)), 'dev')

COMPOSE = f"docker compose -f docker-compose.yml" + \
          (f" -f docker-compose.{ENV}.yml" if ENV != 'dev' else "")

issues = []; fixes_applied = []

def run(cmd: str, timeout=120) -> tuple[int, str, str]:
    """Execute a shell command. Returns (rc, stdout, stderr)."""
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout.strip(), r.stderr.strip()

def run_fix(cmd: str, description: str) -> bool:
    """Run a fix command and track the result."""
    fix(f"{description}")
    print(f"     $ {cmd}")
    rc, out, err_out = run(cmd, timeout=300)
    if rc == 0:
        fixes_applied.append(description)
        ok(f"Done: {description}")
        return True
    else:
        warn(f"Failed: {description}")
        if err_out: print(f"     {err_out[:200]}")
        issues.append(f"Fix failed: {description}")
        return False

def ask_claude(error_context: dict) -> Optional[list[str]]:
    """
    Tier 3: Send unknown error to Claude API for AI-generated fix commands.
    Returns a list of shell commands to execute, or None if unavailable.
    """
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key or not USE_AI:
        return None

    prompt = f"""You are an expert DevOps engineer fixing a Cookers Delight restaurant application.
Stack: Laravel 12 / TastyIgniter v4, React 19, Docker, MySQL 8, Redis 7, pnpm.

The doctor script has detected an issue it cannot fix automatically.
Analyse the context below and return ONLY a JSON array of shell commands to fix it.

Rules:
- Commands must be safe — never delete data volumes or databases
- Try the simplest fix first
- Maximum 5 commands
- Each command must be self-contained (don't assume previous commands ran)
- Prefer --no-interaction flags on all interactive tools
- If the issue is a package version conflict, suggest specific version pins

Context:
{json.dumps(error_context, indent=2)}

Respond with ONLY valid JSON. Example:
["docker compose exec -T backend composer update --no-interaction", "docker compose exec -T backend php artisan optimize:clear"]
"""
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            text = data['content'][0]['text'].strip()
            # Strip markdown code fences if present
            text = re.sub(r'^```json?\s*|\s*```$', '', text, flags=re.MULTILINE).strip()
            commands = json.loads(text)
            if isinstance(commands, list):
                return commands
    except Exception as e:
        warn(f"Claude API unavailable: {e}")
    return None

def ai_fix(category: str, error_text: str, context: dict) -> bool:
    """Run Tier 3 AI fix for a problem the script couldn't solve."""
    warn(f"Built-in fixes exhausted for: {category}")
    if not USE_AI:
        print(f"     Run with --ai flag to enable AI-powered fixes")
        return False

    print(f"  {B}🤖{NC} Asking Claude to diagnose this…")
    commands = ask_claude({
        "category":   category,
        "error":      error_text,
        "compose_env": ENV,
        **context,
    })
    if not commands:
        return False

    print(f"  {B}AI suggests {len(commands)} fix(es):{NC}")
    for i, cmd in enumerate(commands, 1):
        print(f"     {i}. {cmd}")

    if not AUTO_FIX:
        ans = input("\n  Apply these fixes? [y/N]: ").strip().lower()
        if ans != 'y':
            return False

    all_ok = True
    for cmd in commands:
        rc, out, err_out = run(cmd, timeout=300)
        if rc != 0:
            warn(f"Command failed: {cmd}")
            if err_out: print(f"     {err_out[:300]}")
            all_ok = False
        else:
            fixes_applied.append(f"AI fix: {cmd[:60]}")
    return all_ok


# ══════════════════════════════════════════════════════════════════════════════
#  TIER 1 — INSTANT CHECKS
# ══════════════════════════════════════════════════════════════════════════════

head("❶  Docker Engine")
rc, out, _ = run("docker info")
if rc != 0:
    err("Docker is not running")
    sys.exit("Fix: open Docker Desktop or run: sudo systemctl start docker")
docker_ver = re.search(r'Server Version: ([\d.]+)', out)
ok(f"Docker {docker_ver.group(1) if docker_ver else 'running'}")

# Disk space
rc, df_out, _ = run("df -h /var/lib/docker 2>/dev/null || df -h /")
pct_match = re.search(r'(\d+)%', df_out.split('\n')[-1])
if pct_match:
    used = int(pct_match.group(1))
    if used > 90:
        err(f"Disk at {used}% — Docker may fail")
        if AUTO_FIX:
            run_fix("docker system prune -f", "Prune unused Docker layers")
    elif used > 80:
        warn(f"Disk at {used}% — consider pruning")
    else:
        ok(f"Disk usage: {used}%")


head("❷  Environment files")
ENV_FILE = "backend/.env.docker" if ENV != 'dev' else "backend/.env"

if not os.path.exists(ENV_FILE):
    err(f"Missing: {ENV_FILE}")
    example = "backend/.env.docker.example"
    if os.path.exists(example):
        if AUTO_FIX:
            shutil.copy(example, ENV_FILE)
            fixes_applied.append(f"Created {ENV_FILE} from example")
            ok(f"Created {ENV_FILE} — review and fill in CHANGE_ME values")
        else:
            warn(f"Run: cp {example} {ENV_FILE}")
    issues.append(f"Missing {ENV_FILE}")
else:
    ok(f"{ENV_FILE} exists")

    # Check placeholder values
    env_text = open(ENV_FILE).read()
    placeholders = re.findall(r'^(\w+)=(?:CHANGE_ME|your_\w+|"")', env_text, re.MULTILINE)
    for var in placeholders:
        if var in ('APP_KEY',):
            if AUTO_FIX:
                rc, key, _ = run(f"{COMPOSE} exec -T backend php artisan key:generate --show 2>/dev/null")
                if rc == 0 and 'base64:' in key:
                    new_text = re.sub(r'^APP_KEY=.*$', f'APP_KEY={key.strip()}', env_text, flags=re.MULTILINE)
                    open(ENV_FILE, 'w').write(new_text)
                    fixes_applied.append("Auto-generated APP_KEY")
                    ok("APP_KEY generated")
            else:
                warn(f"{var} is a placeholder — run with --fix to auto-generate")
        else:
            warn(f"{var} has a placeholder value — update {ENV_FILE}")


head("❸  Port conflicts")
port_map = {80:'Nginx', 443:'Nginx TLS', 8000:'API', 3306:'MySQL',
            6379:'Redis', 5173:'Vite', 5174:'Vite QR'}

for port, name in port_map.items():
    rc, lsof_out, _ = run(f"lsof -Pi :{port} -sTCP:LISTEN -t 2>/dev/null")
    if rc == 0 and lsof_out.strip():
        # Is it Docker?
        rc2, dp, _ = run("docker ps --format '{{.Ports}}'")
        if f"0.0.0.0:{port}->" in dp:
            ok(f"Port {port} ({name}) — Docker ✓")
        else:
            pid = lsof_out.strip().split('\n')[0]
            proc_rc, proc_name, _ = run(f"ps -p {pid} -o comm= 2>/dev/null")
            err(f"Port {port} ({name}) — blocked by {proc_name or pid}")
            if AUTO_FIX:
                run_fix(f"kill -9 {pid}", f"Kill process blocking port {port}")
            else:
                warn(f"Free it: kill -9 {pid}")
            issues.append(f"Port {port} blocked")
    else:
        ok(f"Port {port} ({name}) — free")


# ══════════════════════════════════════════════════════════════════════════════
#  TIER 2 — DEEP DIAGNOSTIC
# ══════════════════════════════════════════════════════════════════════════════

head("❹  Container health")
SERVICES = ['mysql', 'redis', 'backend', 'queue']

for svc in SERVICES:
    rc, ps_out, _ = run(f"{COMPOSE} ps {svc} 2>/dev/null")
    running = 'running' in ps_out.lower()
    rc2, inspect, _ = run(
        f'docker inspect --format="{{{{.State.Health.Status}}}}" '
        f'$({COMPOSE} ps -q {svc} 2>/dev/null) 2>/dev/null'
    )
    health = inspect.strip()

    if not running:
        err(f"{svc} is NOT running")

        # Get last error from logs
        _, logs, _ = run(f"{COMPOSE} logs --tail=30 {svc} 2>&1")
        err_lines = [l for l in logs.split('\n')
                     if re.search(r'error|fatal|failed|refused|denied', l, re.I)]
        if err_lines:
            print(f"     Last errors:")
            for l in err_lines[-3:]:
                print(f"     {l[:120]}")

        if AUTO_FIX:
            run_fix(f"{COMPOSE} up -d {svc}", f"Start {svc}")

        issues.append(f"{svc} not running")
        continue

    if health in ('healthy', '', 'none', ''):
        ok(f"{svc} running" + (f" ({health})" if health and health != 'none' else ""))
    elif health == 'unhealthy':
        err(f"{svc} UNHEALTHY")

        # Tier 2: service-specific diagnosis
        _, logs, _ = run(f"{COMPOSE} logs --tail=50 {svc} 2>&1")

        if svc == 'backend':
            # ── PHP/Composer package conflicts ─────────────────────────────
            if re.search(r'could not be resolved|version .* does not match', logs):
                if AUTO_FIX:
                    run_fix(
                        f"{COMPOSE} exec -T backend composer update --no-interaction "
                        f"--prefer-dist --no-scripts 2>&1",
                        "Resolve Composer package conflicts"
                    )
                else:
                    ai_fix("php_package_conflict",
                           re.search(r'could not be resolved.*', logs, re.DOTALL).group(0)[:400],
                           {"service": svc, "logs": logs[-1000:]})

            # ── Composer class not found ────────────────────────────────────
            elif re.search(r'Class .* not found|cannot find file .*/vendor', logs, re.I):
                if AUTO_FIX:
                    run_fix(
                        f"{COMPOSE} exec -T backend composer dump-autoload --optimize",
                        "Rebuild Composer autoloader"
                    )

            # ── Missing PHP extension ───────────────────────────────────────
            elif 'extension' in logs and ('not found' in logs or 'disabled' in logs):
                missing_ext = re.findall(r'extension ([\w_]+)', logs)
                if missing_ext and AUTO_FIX:
                    exts = ' '.join(set(missing_ext))
                    run_fix(
                        f"docker exec $({COMPOSE} ps -q backend) "
                        f"apk add --no-cache php82-{missing_ext[0]} 2>/dev/null || "
                        f"docker exec $({COMPOSE} ps -q backend) "
                        f"docker-php-ext-install {missing_ext[0]}",
                        f"Install missing PHP extension(s): {exts}"
                    )
                elif missing_ext:
                    ai_fix("missing_php_extension", '\n'.join(err_lines),
                           {"service": svc, "missing_extensions": missing_ext, "logs": logs[-500:]})

            # ── Storage permissions ─────────────────────────────────────────
            elif re.search(r'permission denied|not writable|failed to open stream', logs, re.I):
                if AUTO_FIX:
                    run_fix(
                        f"{COMPOSE} exec -T backend sh -c "
                        f"'chown -R www-data:www-data storage bootstrap/cache && "
                        f"chmod -R 775 storage bootstrap/cache'",
                        "Fix storage permissions"
                    )

            # ── TastyIgniter plugin missing/changed ─────────────────────────
            elif re.search(r'plugin.*not found|extension.*missing|igniter.*error', logs, re.I):
                if AUTO_FIX:
                    run_fix(
                        f"{COMPOSE} exec -T backend php artisan igniter:install --no-interaction 2>/dev/null || "
                        f"{COMPOSE} exec -T backend php artisan migrate --force",
                        "Reinstall/repair TastyIgniter plugins"
                    )
                else:
                    ai_fix("tastyigniter_plugin", logs[-500:],
                           {"service": svc, "logs": logs[-800:]})

            # ── Generic backend error → AI ──────────────────────────────────
            else:
                err_lines_joined = '\n'.join(err_lines[-5:])
                fixed_by_ai = ai_fix("backend_unknown_error", err_lines_joined,
                                     {"service": svc, "logs": logs[-1000:]})
                if not fixed_by_ai:
                    run_fix(f"{COMPOSE} restart {svc}", f"Restart {svc}")

        elif svc == 'mysql':
            if 'InnoDB' in logs and 'corrupt' in logs.lower():
                warn("MySQL InnoDB corruption detected — attempting repair")
                ai_fix("mysql_corruption", logs[-500:], {"service": svc, "logs": logs[-800:]})
            else:
                run_fix(f"{COMPOSE} restart mysql", "Restart MySQL")

        elif svc == 'queue':
            run_fix(f"{COMPOSE} restart queue", "Restart queue worker")

        issues.append(f"{svc} unhealthy")


head("❺  PHP packages (Composer)")
rc, vendor_out, _ = run(f"{COMPOSE} exec -T backend ls vendor/ 2>/dev/null | wc -l")
vendor_count = int(vendor_out.strip()) if rc == 0 else 0

if vendor_count < 10:
    err(f"vendor/ appears empty or missing ({vendor_count} entries)")
    if AUTO_FIX:
        # Try without the private registry key first
        rc1, _, err1 = run(
            f"{COMPOSE} exec -T backend composer install "
            f"--no-dev --no-interaction --no-scripts 2>&1", timeout=300
        )
        if rc1 != 0:
            # Check if it's an auth error
            if 'carteblanche' in err1 or 'authentication' in err1.lower():
                warn("Composer auth failed — check IGNITER_CARTE_KEY in .env.docker")
                ai_fix("composer_auth_failed", err1[:400],
                       {"env_file": ENV_FILE, "error": err1[:600]})
            elif 'constraint' in err1.lower() or 'conflict' in err1.lower():
                # Version conflict — try relaxing constraints
                run_fix(
                    f"{COMPOSE} exec -T backend composer update "
                    f"--no-interaction --prefer-dist --no-scripts "
                    f"--ignore-platform-reqs 2>&1",
                    "Resolve Composer version conflicts (relaxed platform reqs)"
                )
            else:
                ai_fix("composer_install_failed", err1[:600],
                       {"error": err1[:800], "php_version": ""})
    issues.append("vendor/ incomplete")
else:
    ok(f"vendor/ has {vendor_count} packages")

# Check for outdated security-vulnerable packages
rc, audit, _ = run(
    f"{COMPOSE} exec -T backend composer audit --no-interaction 2>/dev/null | "
    f"grep -c 'Found' || true"
)
if rc == 0 and audit.strip().isdigit() and int(audit.strip()) > 0:
    warn(f"Composer audit found {audit.strip()} vulnerability/issue(s) — run: make composer-audit")


head("❻  Node packages (pnpm)")
for pkg_dir, name in [('.', 'public site'), ('apps/qr', 'QR app')]:
    pkg_json = os.path.join(pkg_dir, 'package.json')
    modules  = os.path.join(pkg_dir, 'node_modules')

    if not os.path.exists(pkg_json):
        warn(f"No package.json in {pkg_dir}")
        continue

    if not os.path.exists(modules) or len(os.listdir(modules)) < 5:
        err(f"node_modules/ missing or empty for {name}")
        if AUTO_FIX:
            cwd = f"cd {pkg_dir} && " if pkg_dir != '.' else ""
            rc1, _, err1 = run(f"{cwd}pnpm install --frozen-lockfile 2>&1", timeout=300)
            if rc1 != 0:
                if 'peer dep' in err1.lower() or 'peer_dep' in err1.lower():
                    run_fix(
                        f"{cwd}pnpm install --no-strict-peer-dependencies 2>&1",
                        f"Install {name} packages (relaxed peer deps)"
                    )
                elif 'lockfile' in err1.lower():
                    run_fix(
                        f"{cwd}pnpm install 2>&1",
                        f"Install {name} packages (regenerate lockfile)"
                    )
                else:
                    ai_fix("pnpm_install_failed", err1[:600],
                           {"package_dir": pkg_dir, "name": name, "error": err1[:800]})
        issues.append(f"node_modules missing for {name}")
    else:
        mod_count = len(os.listdir(modules))
        ok(f"{name}: {mod_count} packages in node_modules")

    # Check for peer dep warnings
    rc, pnpm_check, _ = run(f"cd {pkg_dir} && pnpm list 2>&1 | grep -c 'missing peer' || true")
    if rc == 0 and pnpm_check.strip().isdigit() and int(pnpm_check.strip()) > 0:
        warn(f"{name}: {pnpm_check.strip()} missing peer dep(s) — run with --fix to resolve")


head("❼  Directory integrity")
REQUIRED_DIRS = [
    ('backend/storage/app/public',           '775', 'www-data'),
    ('backend/storage/framework/cache/data', '775', 'www-data'),
    ('backend/storage/framework/sessions',   '775', 'www-data'),
    ('backend/storage/framework/views',      '775', 'www-data'),
    ('backend/storage/logs',                 '775', 'www-data'),
    ('backend/bootstrap/cache',              '775', 'www-data'),
    ('nginx',                                '755', None),
    ('scripts',                              '755', None),
]
for path, perms, owner in REQUIRED_DIRS:
    if os.path.exists(path):
        ok(f"{path} exists")
    else:
        err(f"Missing directory: {path}")
        if AUTO_FIX:
            os.makedirs(path, exist_ok=True)
            fixes_applied.append(f"Created {path}")
            ok(f"Created {path}")
        issues.append(f"Missing dir: {path}")

# Check scripts are executable
for script in ['scripts/doctor.py', 'scripts/start.sh', 'scripts/fix.sh',
               'backend/docker/entrypoint.sh']:
    if os.path.exists(script):
        if not os.access(script, os.X_OK):
            err(f"{script} is not executable")
            if AUTO_FIX:
                run_fix(f"chmod +x {script}", f"Make {script} executable")
        else:
            ok(f"{script} is executable")


head("❽  Database migrations")
if run(f"{COMPOSE} ps --status running backend 2>/dev/null")[1]:
    rc, migrate_status, err_out = run(
        f"{COMPOSE} exec -T backend php artisan migrate:status "
        f"--no-interaction 2>&1 | tail -20"
    )
    if rc != 0:
        if 'SQLSTATE' in err_out:
            err("Database connection failed in migrate:status")
            ai_fix("db_connection", err_out[:400],
                   {"db_env": "mysql", "error": err_out[:600]})
        else:
            warn(f"migrate:status returned non-zero: {err_out[:200]}")
    else:
        pending = migrate_status.count('Pending')
        if pending > 0:
            warn(f"{pending} pending migration(s)")
            if AUTO_FIX:
                rc2, mig_out, mig_err = run(
                    f"{COMPOSE} exec -T backend php artisan migrate "
                    f"--force --no-interaction 2>&1"
                )
                if rc2 == 0:
                    fixes_applied.append(f"Ran {pending} pending migrations")
                    ok(f"Migrations applied")
                elif 'already exists' in mig_err or 'Duplicate column' in mig_err:
                    # Column already exists — try each migration
                    warn("Schema conflict — running migrations with pretend to diagnose")
                    ai_fix("migration_conflict", mig_err[:500],
                           {"error": mig_err[:800], "pending": pending})
                else:
                    ai_fix("migration_failed", mig_err[:500],
                           {"error": mig_err[:800], "output": mig_out[:800]})
        else:
            ok("All migrations up to date")

    # Verify CD extension tables
    cd_tables = [
        'cd_announcements', 'cd_settings',
        'cd_dining_tables', 'cd_table_sessions'
    ]
    for table in cd_tables:
        rc, t_out, _ = run(
            f"{COMPOSE} exec -T backend php -r \""
            f"try {{(new PDO('mysql:host=$_SERVER[DB_HOST];dbname=$_SERVER[DB_DATABASE]',"
            f"'$_SERVER[DB_USERNAME]','$_SERVER[DB_PASSWORD]'))"
            f"->query('SELECT 1 FROM {table} LIMIT 1'); echo 'ok';}} "
            f"catch(Exception \$e) {{echo 'miss';}}\" 2>/dev/null"
        )
        if 'ok' in t_out:
            ok(f"Table {table} ✓")
        else:
            err(f"Table {table} missing")
            if AUTO_FIX:
                run_fix(
                    f"{COMPOSE} exec -T backend php artisan migrate --force",
                    f"Re-run migrations for {table}"
                )
            issues.append(f"Missing table: {table}")


head("❾  API health")
for attempt in range(1, 6):
    try:
        with urllib.request.urlopen("http://localhost:8000/api/health", timeout=5) as r:
            body = json.loads(r.read())
            if body.get('status') == 'ok':
                ok(f"GET /api/health → 200 OK  (attempt {attempt})")
                break
    except Exception as e:
        if attempt < 5:
            print(f"  Waiting for API ({attempt}/5)…\r", end='')
            time.sleep(4)
        else:
            err(f"API unreachable after 5 attempts: {e}")
            _, backend_logs, _ = run(f"{COMPOSE} logs --tail=20 backend 2>&1")
            ai_fix("api_unreachable",
                   str(e),
                   {"logs": backend_logs[-800:], "attempt_count": 5})
            issues.append("API unreachable")


head("❿  Frontend builds")
for build_dir, name in [('dist', 'public site'), ('apps/qr/dist', 'QR app')]:
    if os.path.exists(build_dir) and os.listdir(build_dir):
        ok(f"{name} build exists ({build_dir})")
    else:
        warn(f"{name} has no build output ({build_dir})")
        # In dev this is expected (Vite dev server). In prod it's a problem.
        if ENV != 'dev':
            err(f"{name} build missing in {ENV} environment")
            if AUTO_FIX:
                cmd = f"pnpm run build" if build_dir == 'dist' else f"cd apps/qr && pnpm run build"
                rc, _, build_err = run(cmd, timeout=300)
                if rc != 0:
                    ai_fix(f"build_failed_{name.replace(' ', '_')}",
                           build_err[:600],
                           {"name": name, "dir": build_dir, "error": build_err[:800]})
            issues.append(f"{name} build missing")


# ══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
print(f"\n{BOLD}{'═'*54}{NC}")
if not issues:
    print(f"{G}{BOLD}  ✓  All systems healthy — {len(fixes_applied)} fix(es) applied{NC}")
else:
    print(f"{Y}{BOLD}  ⚠  {len(fixes_applied)} fixed, {len(issues)} remaining issue(s){NC}")
    for i in issues:
        print(f"  {R}•{NC}  {i}")
    print("")
    print(f"  Re-run with: python3 scripts/doctor.py --fix --ai")
    print(f"  Deep reset:  make fix")
    print(f"  Nuke:        make nuke  (⚠ deletes data)")
print(f"{BOLD}{'═'*54}{NC}\n")

if fixes_applied:
    print(f"  Fixes applied this run:")
    for f_item in fixes_applied:
        print(f"  {G}→{NC}  {f_item}")
    print()

sys.exit(0 if not issues else 1)
