"""Publish explicitly named MAKSON PROJECT source files to Timeweb."""
import argparse
import getpass
import io
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import sys
import tarfile


ROOT = Path(__file__).resolve().parent.parent
HOST = '201.34.146.102'
APP = '/var/www/makson/app'
WORKER = '/opt/makson-tools'
BACKUPS = '/var/backups'
RESTART = {
    'tools': 'systemctl restart makson-tools',
    'svyaz': 'systemctl restart makson-svyaz',
    'node': 'mogwai sites backend actions --sn=makson_sndtag_ru --action=restart',
}
ROOT_ASSETS = {'.js', '.css', '.html', '.svg', '.png', '.jpeg', '.jpg', '.mp3', '.webmanifest'}
SAFE_NAME = re.compile(r'[A-Za-z0-9_ .+/-]+')


def deployment_file(name):
    path = PurePosixPath(name)
    parts = path.parts
    if (not parts or name != path.as_posix() or path.is_absolute() or not SAFE_NAME.fullmatch(name)
            or any(p.startswith('.') or p in {'data', 'private', 'node_modules', 'venv', 'kart', 'tests', 'test', '__pycache__'} for p in parts)
            or any(p.lower().startswith('shabash') for p in parts)):
        raise ValueError(f'Путь запрещён: {name}')
    source = ROOT / path
    if not source.is_file() or source.resolve() != source:
        raise ValueError(f'Файл отсутствует или путь содержит ссылку: {name}')
    suffix = path.suffix.lower()
    if parts[0] == 'tools-worker' and len(parts) == 2 and path.name in {'worker.py', 'catalog.py', 'convert.py', 'edit.py'}:
        return source, f'{WORKER}/{path.name}', 'root', 'tools'
    if parts[0] == 'svyaz' and suffix in {'.py', '.html'} and (len(parts) == 2 or parts[1] in {'config', 'chat'}):
        return source, f'{APP}/{path}', 'makson', 'svyaz'
    if len(parts) == 1 and suffix in ROOT_ASSETS:
        return source, f'{APP}/{path}', 'makson', 'node'
    if parts[0] in {'importopoly', 'fonts', 'pulse-music'} and suffix in ROOT_ASSETS | {'.ttf', '.txt'}:
        return source, f'{APP}/{path}', 'makson', 'node'
    raise ValueError(f'Этот путь не относится к исходникам боевой сборки: {name}')


def package(files):
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode='w:gz') as tar:
        for source, destination, _, _ in files:
            content = source.read_bytes()
            if source == ROOT / 'server.js':
                # The cloud clone reconstructs two audio assets. Timeweb already has them.
                content = re.sub(rb"^import \{restoreAudioAssets\} from './cloud/assets\.js';\r?\n|^await restoreAudioAssets\(\);\r?\n", b'', content, flags=re.M)
            entry = tarfile.TarInfo(destination.lstrip('/'))
            entry.size = len(content)
            tar.addfile(entry, io.BytesIO(content))
    archive.seek(0)
    return archive


def connect(args):
    try:
        import paramiko
    except ImportError:
        sys.exit('Установи Paramiko в отдельном venv: python -m pip install -r cloud/requirements-deploy.txt')
    client = paramiko.SSHClient()
    client.load_host_keys(str(ROOT / 'cloud/timeweb.known_hosts'))
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    options = {'timeout': 15, 'auth_timeout': 15, 'banner_timeout': 20}
    if args.identity:
        options.update(key_filename=str(Path(args.identity).expanduser()), allow_agent=False, look_for_keys=False)
    else:
        password = os.environ.get('MAKSON_SSH_PASSWORD')
        if not password and not sys.stdin.isatty():
            sys.exit('Для фонового запуска задай секрет MAKSON_SSH_PASSWORD или передай --identity.')
        options.update(password=password or getpass.getpass('Пароль SSH для MAKSON PROJECT: '), allow_agent=False, look_for_keys=False)
    client.connect(HOST, username='root', **options)
    client.get_transport().set_keepalive(15)
    return client


def remote(client, script, *, emit=True):
    stdin, stdout, stderr = client.exec_command('bash -se', timeout=180)
    stdin.write(script)
    stdin.flush()
    stdin.channel.shutdown_write()
    out, err = stdout.read().decode(errors='replace'), stderr.read().decode(errors='replace')
    if emit and out:
        print(out, end='')
    if err:
        print(err, end='', file=sys.stderr)
    if stdout.channel.recv_exit_status():
        raise RuntimeError('Команда на сервере завершилась с ошибкой. Если создана копия, её путь указан выше.')
    return out.strip()


def publish(client, files):
    q = shlex.quote
    stage = remote(client, 'umask 077; mktemp -d /tmp/makson-release.XXXXXXXX\n', emit=False)
    if not re.fullmatch(r'/tmp/makson-release\.[A-Za-z0-9]{8}', stage):
        raise RuntimeError('Не удалось определить временный каталог сервера.')
    try:
        with client.open_sftp() as sftp:
            sftp.putfo(package(files), stage + '/release.tar.gz')
        # The lock covers both the backup and all file/service changes.
        lines = [f'cd {q(stage)}', 'umask 077', 'exec 9>/run/lock/makson-publish.lock', 'flock -n 9',
                 'tmp=', 'trap \'if [ -n "$tmp" ]; then rm -f -- "$tmp"; fi\' EXIT']
        for _, target, _, service in files:
            base = WORKER if service == 'tools' else APP
            lines.extend([f'test -d {q(base)}',
                          f'test "$(realpath -m -- {q(target)})" = {q(target)}',
                          f'test ! -e {q(target)} || test -f {q(target)}'])
        lines.extend([f'backup=$(mktemp -d {BACKUPS}/makson-release-XXXXXXXX)', 'echo "Резервная копия: $backup"',
                      'tar -xzf release.tar.gz', ': > "$backup/existing"', ': > "$backup/missing"'])
        for _, target, _, _ in files:
            rel = q(target.lstrip('/'))
            lines.append(f'if [ -f {q(target)} ]; then printf "%s\\n" {rel} >> "$backup/existing"; else printf "%s\\n" {rel} >> "$backup/missing"; fi')
        services = [service for service in RESTART if any(f[3] == service for f in files)]
        lines.extend(['tar -C / -czf "$backup/files.tar.gz" -T "$backup/existing"',
                      'printf "%s\\n" ' + ' '.join(map(q, services)) + ' > "$backup/services"'])
        for _, target, owner, _ in files:
            # Install to a neighbouring temp file and rename so the live file stays whole.
            parent = q(str(Path(target).parent))
            lines.extend([f'test -d {parent} || install -d -o {owner} -g {owner} -m 755 {parent}',
                          f'tmp=$(mktemp {q(target + ".makson.XXXXXXXX")})',
                          f'install -o {owner} -g {owner} -m 644 {q(target.lstrip("/"))} "$tmp"',
                          f'mv -fT "$tmp" {q(target)}', 'tmp='])
        lines.extend(RESTART[service] for service in services)
        remote(client, '\n'.join(lines) + '\necho "Публикация завершена"\n')
    finally:
        remote(client, f'rm -rf -- {q(stage)}\n', emit=False)


def rollback(client, backup):
    if not re.fullmatch(r'/var/backups/makson-release-[A-Za-z0-9]{8}', backup):
        raise ValueError('Укажи путь резервной копии, который напечатал этот скрипт.')
    lines = ['exec 9>/run/lock/makson-publish.lock', 'flock -n 9', f'cd {shlex.quote(backup)}',
             'tar -C / -xzpf files.tar.gz', 'while IFS= read -r name; do rm -f -- "/$name"; done < missing']
    lines += [f'if grep -Fxq {service} services; then {command}; fi' for service, command in RESTART.items()]
    remote(client, '\n'.join(lines) + '\necho "Откат завершён"\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--apply', action='store_true', help='загрузить перечисленные файлы')
    mode.add_argument('--check', action='store_true', help='проверить SSH и расположение сервисов')
    mode.add_argument('--rollback', metavar='BACKUP', help='восстановить конкретную резервную копию')
    parser.add_argument('--identity', help='путь к приватному SSH-ключу на текущей машине')
    parser.add_argument('files', nargs='*')
    args = parser.parse_args()
    if not args.files and not (args.check or args.rollback):
        parser.error('Укажи изменённые файлы, например orbit.js console.css.')
    if args.files and (args.check or args.rollback):
        parser.error('--check и --rollback не принимают список файлов.')
    try:
        files = [deployment_file(name) for name in dict.fromkeys(args.files)]
        for source, target, owner, service in files:
            print(f'{source.relative_to(ROOT)} → {target} ({owner}, {service})', flush=True)
        if not (args.apply or args.check or args.rollback):
            print('Список готов. Для публикации добавь --apply.')
            return
        with connect(args) as client:
            if args.check:
                remote(client, f'test -d {APP}\ncommand -v mogwai\nstat -c "%U:%G %n" {APP}\nsystemctl is-active makson-svyaz makson-tools\n')
            elif args.rollback:
                rollback(client, args.rollback)
            else:
                publish(client, files)
    except Exception as error:
        sys.exit(str(error))


if __name__ == '__main__':
    main()
