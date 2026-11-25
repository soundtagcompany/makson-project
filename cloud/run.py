"""Run the site and its side services in a single Linux development workspace."""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tools', action='store_true', help='start the isolated media worker')
    options = parser.parse_args()
    node = shutil.which('node')
    if not node:
        parser.error('Install Node.js 22+ and put it on PATH.')
    accounts = ROOT / '.venv-svyaz/bin/python'
    tools = ROOT / '.venv-tools/bin/python'
    if not accounts.exists() or (options.tools and not tools.exists()):
        parser.error('Run sh cloud/setup.sh (add --tools for the media worker).')
    if options.tools:
        needed = ['bwrap', 'ffmpeg', 'ffprobe', 'libreoffice', 'pdftoppm', 'pandoc']
        missing = [name for name in needed if not shutil.which(name)]
        if missing or sys.platform != 'linux':
            parser.error('Media worker requires Linux and: ' + ', '.join(missing or needed))
        subprocess.run(['bwrap', '--unshare-all', '--ro-bind', '/', '/', '/bin/true'], check=True)

    port = int(os.environ.get('PORT', '4173'))
    accounts_port = int(os.environ.get('SVYAZ_PORT', '3180'))
    origin = os.environ.get('MAKSON_SITE_URL', f'http://localhost:{port}').rstrip('/')
    url = urlsplit(origin)
    if url.scheme not in {'http', 'https'} or not url.hostname or url.path or url.query or url.fragment or url.username or url.password:
        parser.error('MAKSON_SITE_URL must be an HTTP(S) origin without a path or credentials.')
    state = ROOT / '.cloud'
    state.mkdir(mode=0o700, exist_ok=True)
    config = state / 'svyaz.json'
    secret = os.environ.get('SVYAZ_SECRET')
    if not secret and config.exists():
        secret = json.loads(config.read_text()).get('SECRET_KEY')
    with os.fdopen(os.open(config, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as stream:
        json.dump({
            'SECRET_KEY': secret or secrets.token_urlsafe(64),
            'SITE_URL': origin,
            'DATABASE_PATH': str(state / 'svyaz.sqlite3'),
            'EMAIL_FILE_PATH': str(state / 'mail'),
            'GAME_PORT': port,
        }, stream)
    env = {
        **os.environ,
        'PORT': str(port),
        'HOST': os.environ.get('HOST', '0.0.0.0'),
        'MAKSON_SITE_URL': origin,
        'SVYAZ_PORT': str(accounts_port),
        'SVYAZ_CONFIG': str(config),
        'SVYAZ_DEV': '0',
        'MAKSON_TOOLS_SOCKET': str(state / 'tools.sock'),
    }
    subprocess.run([str(accounts), 'manage.py', 'migrate', '--noinput'], cwd=ROOT / 'svyaz', env=env, check=True)
    processes = []
    try:
        processes.append(subprocess.Popen(
            [str(accounts), '-m', 'waitress', f'--listen=127.0.0.1:{accounts_port}',
             '--trusted-proxy=127.0.0.1', '--trusted-proxy-headers=x-forwarded-proto', 'config.wsgi:application'],
            cwd=ROOT / 'svyaz', env=env,
        ))
        if options.tools:
            worker_env = {
                **env,
                'TOOLS_PYTHON': str(tools),
                'TOOLS_STATE': str(state / 'tools-jobs'),
                'TOOLS_SOCKET': env['MAKSON_TOOLS_SOCKET'],
                'TOOLS_NODE': node,
                'TOOLS_UNSANDBOXED': '0',
            }
            processes.append(subprocess.Popen([str(tools), 'tools-worker/worker.py'], cwd=ROOT, env=worker_env))
        processes.append(subprocess.Popen([node, 'server.js'], cwd=ROOT, env=env))
        print(f'MAKSON PROJECT · {origin} · port {port}', flush=True)
        while all(process.poll() is None for process in processes):
            time.sleep(.3)
        return next((process.returncode for process in processes if process.returncode), 1)
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == '__main__':
    def stop(_signum, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
