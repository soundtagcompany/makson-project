# Публикация MAKSON PROJECT на Timeweb

Боевой сайт — [makson.sndtag.ru](https://makson.sndtag.ru). Исходники — [soundtagcompany/makson-project](https://github.com/soundtagcompany/makson-project), ветка `main`. Коммит на GitHub сохраняет код. Сайт обновляется отдельной командой, которая загружает файлы по SSH.

## Где что лежит

| Что | Значение |
| --- | --- |
| SSH | `root@201.34.146.102`, порт `22` |
| Рабочая папка Node.js | `/var/www/makson/app` |
| Владелец файлов сайта | `makson:makson` |
| Бэкенд FastPanel | `makson_sndtag_ru`, Node.js на `127.0.0.1:3179` |
| Исходники «СВЯЗИ» | `/var/www/makson/app/svyaz` |
| Сервис «СВЯЗИ» | `makson-svyaz`, Django на `127.0.0.1:3180` |
| Python «СВЯЗИ» | `/var/www/makson/svyaz-venv/bin/python` |
| Конфигурация «СВЯЗИ» | `/var/www/makson/private/svyaz.json` |
| База «СВЯЗИ» | `/var/www/makson/private/svyaz.sqlite3` |
| Обработчик медиа | `/opt/makson-tools`, сервис `makson-tools` |
| Сокет обработчика | `/run/makson-tools/worker.sock` |
| Резервные копии релизов | `/var/backups/makson-release-XXXXXXXX` |

Остальные сайты на сервере, включая `sndtag.ru`, оставляй в покое. Для релиза передавай конкретные файлы исходников. Серверные базы, вложения, `.data`, `private` и конфиги с секретами остаются на месте. Картинг и Шабаш пока закрыты для публикации, включая их пункты каталога и маршруты.

## Подключение

В терминале из корня репозитория выполни команду. Введи пароль `root` в запросе SSH. Файл `cloud/timeweb.known_hosts` содержит публичный ключ самого сервера.

```sh
ssh -o UserKnownHostsFile=cloud/timeweb.known_hosts -o StrictHostKeyChecking=yes root@201.34.146.102
```

Если уже выдан SSH-ключ, добавь к команде `-i /путь/к/ключу`. Для чатбота без интерактивного терминала передай пароль через секрет окружения `MAKSON_SSH_PASSWORD` на этапе выполнения. Для ключа передай скрипту `--identity /путь/к/ключу`. Пароль и приватный ключ хранятся вне GitHub. При расхождении ключа хоста сверь новый отпечаток с владельцем сервера.

## Загрузка изменений на сайт

Выполняй команды локально или в облачном терминале из корня репозитория. Зависимость нужна только на машине, с которой идёт публикация.

```sh
python3 -m venv .venv-deploy
.venv-deploy/bin/python -m pip install -r cloud/requirements-deploy.txt
```

При первичной настройке можно проверить SSH и наличие сервисов без изменения файлов.

```sh
.venv-deploy/bin/python cloud/deploy.py --check
```

Допустим, менялись `orbit.js` и `console.css`. Подставь свои файлы вместо этих двух. Имена с пробелами заключай в кавычки.

```sh
.venv-deploy/bin/python cloud/deploy.py --apply orbit.js console.css
```

Скрипт запрашивает пароль скрытым вводом, если секрет окружения или ключ не переданы. Он показывает серверные пути, сохраняет версии перечисленных файлов в `/var/backups`, загружает новые версии и перезапускает только затронутые сервисы. Запиши напечатанный путь резервной копии. Для просмотра списка назначений можно выполнить ту же команду без `--apply`.

| Что изменилось | Пример аргументов для `--apply` |
| --- | --- |
| Интерфейс или игра в Node | `index.html orbit.js console.css` |
| Django и клиент «СВЯЗИ» | `svyaz/chat/views.py svyaz.js` |
| Экспорт Монтажки и его интерфейс | `tools-worker/edit.py editor.js` |

Для обычного релиза достаточно точечной локальной проверки изменённого сценария. Релизный скрипт не запускает тестовый набор и не открывает боевой сайт. После публикации передай владельцу список файлов и путь резервной копии. Владелец сам открывает сайт и проверяет результат.

## Команды на сервере

Для ручного перезапуска выбери только нужную команду. При обычной загрузке скрипт выполняет её сам.

```sh
mogwai sites backend actions --sn=makson_sndtag_ru --action=restart
systemctl restart makson-svyaz
systemctl restart makson-tools
```

Для разбора ошибки SSH или запуска Django и обработчика медиа используй серверные журналы.

```sh
journalctl -u makson-svyaz -n 50 --no-pager
journalctl -u makson-tools -n 50 --no-pager
```

### Если релиз меняет схему Django

Согласуй окно для миграции и резервную копию боевой SQLite. Файловая копия релиза содержит только исходники. Чтобы сохранить согласованный снимок базы на сервере, выполни по SSH до миграции.

```sh
umask 077
backup=$(mktemp -d /var/backups/makson-svyaz-db-XXXXXXXX)
/var/www/makson/svyaz-venv/bin/python - "$backup/svyaz.sqlite3" <<'PY'
from contextlib import closing
import sqlite3
import sys

with closing(sqlite3.connect("file:/var/www/makson/private/svyaz.sqlite3?mode=ro", uri=True)) as source:
    with closing(sqlite3.connect(sys.argv[1])) as snapshot:
        source.backup(snapshot)
PY
printf '%s\n' "$backup/svyaz.sqlite3"
```

Опубликуй код и файл миграции по согласованному плану. Сама миграция выполняется на сервере с действующей конфигурацией.

```sh
runuser -u makson -- env SVYAZ_CONFIG=/var/www/makson/private/svyaz.json \
  /var/www/makson/svyaz-venv/bin/python /var/www/makson/app/svyaz/manage.py migrate --noinput
systemctl restart makson-svyaz
```

Файловый откат не откатывает миграцию. Перед откатом схемы выясни, какие данные были записаны после неё, чтобы не потерять новые сообщения и аккаунты.

## Откат файлов

Возьми путь копии из вывода нужной публикации и выполни команду из корня репозитория.

```sh
.venv-deploy/bin/python cloud/deploy.py --rollback /var/backups/makson-release-XXXXXXXX
```

Скрипт восстановит прежние файлы и их владельцев, уберёт файлы, добавленные этим релизом, и перезапустит соответствующие сервисы. Для частичного отката или при наличии более свежих релизов сначала сравни затронутые файлы, чтобы не перезаписать последующие изменения.
