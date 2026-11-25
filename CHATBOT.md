# Подключение и публикация из чата

Репозиторий — [soundtagcompany/makson-project](https://github.com/soundtagcompany/makson-project), ветка `main`. Сайт — [makson.sndtag.ru](https://makson.sndtag.ru).

1. Подключи рабочее окружение к репозиторию с доступом на запись. Для публикации на сайт окружению также нужен исходящий SSH на `201.34.146.102:22`. Передай действующий пароль `root` через секрет окружения `MAKSON_SSH_PASSWORD` на этапе запуска. В интерактивном терминале можно ввести пароль скрытым вводом. Если доступ выдан ключом, укажи `--identity /путь/к/ключу`.
2. Сохрани изменения коммитом в GitHub. Для публикации на сайт возьми список изменённых рабочих файлов, указанных в задаче.
3. Выполни из корня репозитория следующие команды. Замени `orbit.js console.css` на свой список.

```sh
python3 -m venv .venv-deploy
.venv-deploy/bin/python -m pip install -r cloud/requirements-deploy.txt
.venv-deploy/bin/python cloud/deploy.py --apply orbit.js console.css
```

Прямой вход в терминал Timeweb из корня репозитория.

```sh
ssh -o UserKnownHostsFile=cloud/timeweb.known_hosts -o StrictHostKeyChecking=yes root@201.34.146.102
```

Файлы сайта идут в `/var/www/makson/app` с владельцем `makson:makson`. Для Node.js используется `mogwai sites backend actions --sn=makson_sndtag_ru --action=restart`. Для Django и обработчика используются `systemctl restart makson-svyaz` и `systemctl restart makson-tools`. Скрипт выполняет нужные перезапуски и печатает путь копии под `/var/backups`.

При ошибке сообщи, на каком шаге она возникла, и укажи путь копии, если она уже создана. При успехе дай ссылку на коммит, список загруженных файлов и путь копии. Боевой сайт проверяет владелец. Картинг и Шабаш пока не публикуются. Другой сайт `sndtag.ru` и рабочие базы не трогай.

[Точные пути сервисов, резервная копия SQLite, миграции и откат](DEPLOYMENT.md)
