# Subscription Tracker

Монорепозиторий проекта «Учёт подписок с уведомлениями и аналитикой расходов».

## Структура

- `backend/` — Spring Boot API
- `frontend/` — UI
- `ml/` — ML-сервис
- `docs/` — документация, ADR, ERD, глоссарий
- `tests/` — e2e тесты

## Клонирование

git clone https://ssau.saas.sferaplatform.ru/app/sourcecode/api/tp_ivt_team9_2026/tp_ivt_team9_2026.git
cd tp_ivt_team9_2026

## Требования

- Docker Desktop (или Docker Engine + Docker Compose)
- Git
- Node.js 22.12+ (ветка 22) и npm — для разработки frontend без Docker

## Запуск

### Настройка синхронизации с GitHub

Необходимо, чтобы отправлялись изменения одновременно и в "Сфера.Код", и в GitHub, выполните эти команды **один раз** после клонирования:

```sh
# 1. Добавляем адрес Сферы как первый и GitHub как второй push-URL (не меняя основной origin)
git remote set-url --add --push origin https://ssau.saas.sferaplatform.ru/app/sourcecode/api/tp_ivt_team9_2026/tp_ivt_team9_2026.git
git remote set-url --add --push origin https://github.com/Wazewa/SubscriptionTracker

# 2. Проверяем, что теперь два адреса для push
git remote -v
```

## Публикация изменений в Сфере и GitHub

В проекте используются два удалённых Git-репозитория:

- **Сфера.Код (`origin`)** — основной репозиторий, в котором ведётся разработка и хранится исходная история изменений.
- **GitHub (`github`)** — репозиторий для CI/CD и работы с Pull Request.

Поскольку история веток `master` в Sphere и GitHub может различаться, для публикации изменений используются специальные
скрипты. Они обеспечивают перенос изменений между репозиториями без необходимости вручную выполнять `cherry-pick`.

### 1. Первоначальная подготовка GitHub Pull Request

Для каждой новой задачи первоначальную подготовку GitHub-ветки необходимо выполнить **один раз**.

После создания исходной ветки и реализации первых изменений разработчик выполняет:

```bash
git add .
git commit -m "feat: implement new task"
./scripts/prepare-github-pr.sh
```

Скрипт `prepare-github-pr.sh`:

- проверяет настройки удалённых репозиториев и состояние рабочей копии;
- получает актуальные данные из Sphere и GitHub;
- проверяет соответствие базовых деревьев `master`;
- создаёт отдельную локальную ветку с префиксом `github-pr/` на основе GitHub `master`;
- переносит изменения исходной ветки в подготовленную ветку;
- создаёт коммит и публикует исходную ветку в Sphere, а подготовленную — в GitHub.

После успешного выполнения разработчик создаёт Pull Request на GitHub, направленный в `master`.

**Важно:** повторно запускать `prepare-github-pr.sh` для уже подготовленной задачи не требуется.

### 2. Последующая публикация изменений

После первоначальной подготовки Pull Request дальнейшая разработка продолжается в исходной ветке Sphere.

Каждый раз, когда разработчик хочет опубликовать новые изменения в обоих репозиториях, он выполняет:

```bash
git add .
git commit -m "fix: address review comments"
./scripts/push-both.sh
```

Скрипт `push-both.sh`:

- проверяет состояние исходной ветки и удалённых репозиториев;
- получает актуальные данные из Sphere и GitHub;
- проверяет возможность безопасной публикации изменений;
- отправляет новые коммиты исходной ветки в Sphere;
- определяет последний синхронизированный коммит по метке `Source-Commit` в истории GitHub-ветки;
- переносит только изменения, появившиеся после последней синхронизации;
- создаёт коммит в подготовленной GitHub-ветке и отправляет его в существующую ветку Pull Request.

Таким образом, существующий Pull Request автоматически обновляется при публикации новых изменений.

Скрипт не требует ручного переключения между исходной и подготовленной ветками.

### 3. Обработка ошибок и ограничения

При работе со скриптами необходимо учитывать следующие правила:

- Перед запуском изменения должны быть закоммичены, рабочая копия должна быть чистой.
- Для одной задачи `prepare-github-pr.sh` запускается только один раз.
- `push-both.sh` используется для всех последующих публикаций изменений.
- Скрипты не используют принудительную отправку (`git push --force`).
- При обнаружении расхождения истории, конфликтов или некорректного состояния веток публикация прекращается.
- Если отправка в Sphere прошла успешно, но отправка в GitHub завершилась ошибкой, подготовленный локальный коммит
- сохраняется. После устранения причины ошибки можно повторно запустить `push-both.sh`.

**Не рекомендуется использовать обычную команду `git push origin` для публикации изменений:** у `origin` настроено
несколько адресов отправки, а история Sphere и GitHub различается. Для корректной публикации необходимо
использовать предусмотренные скрипты.

### 4. Краткая последовательность действий

| Ситуация | Действие |
|---|---|
| Начало новой задачи | Создать исходную ветку |
| Первая публикация задачи | Запустить `prepare-github-pr.sh` |
| Создание Pull Request | Создать PR на GitHub |
| Последующие изменения | Выполнить `git add`, `git commit`, запустить `push-both.sh` |
| Обновление существующего PR | Выполняется автоматически при успешной публикации |

**Основное правило:** `prepare-github-pr.sh` — первоначальная подготовка Pull Request; `push-both.sh` — публикация
всех последующих изменений в Sphere и GitHub.

### Первый запуск

1. Скопируй `.env.example` в `.env`:

```sh
cp .env.example .env
```

2. Сгенерируй JWT-секрет (минимум 64 символа) и вставь в `.env` в `JWT_SECRET`

3. Запусти одной командой

```sh
 `docker compose up --build`
```

Frontend доступен на http://localhost:3000, backend — на http://localhost:8080, health -
на http://localhost:8080/health.
Swagger - http://localhost:8080/swagger-ui.html
Frontend содержит меню, авторизацию, Dashboard и страницу подписок. Для регистрации и входа требуется backend; подписки
пока проверяются на явно обозначенных демо-данных в режиме разработки. Подготовка API списка и
ограничения описаны в [frontend/SUBSCRIPTIONS.md](frontend/SUBSCRIPTIONS.md).

### Остановка

```sh
docker compose down
```

### Только backend через Docker

Подними только PostgreSQL:

```sh
docker compose up postgres -d
```

Потом из backend:

```sh
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

### Только frontend через Docker

Из корня репозитория:

```sh
docker compose up -d --build frontend
```

Открой http://localhost:3000. Для остановки: `docker compose stop frontend`.
Переменные из `.env` нужны сервисам backend и PostgreSQL. Для сборки frontend секреты не требуются; API списка подписок
пока выключен до согласования контракта.
Compose может предупредить об отсутствующих переменных остальных сервисов.

### Разработка frontend без Docker

```sh
cd frontend
npm ci
npm run dev
```

Открой http://localhost:3000. Изменения исходников обновляются автоматически.
`npm run typecheck` проверяет TypeScript; `npm run build` проверяет типы и собирает
production-версию в `frontend/dist`. `npm run preview` позволяет проверить сборку
на порту 3000 после остановки dev-сервера.

### Docker frontend

`frontend/Dockerfile` сначала собирает приложение в Node.js, затем обслуживает
статические файлы через nginx. Конфигурация поддерживает открытие вложенных
SPA-маршрутов и проверку здоровья `/health`. Контейнер слушает порт 80,
Compose публикует его на порту 3000 компьютера.

## API

Swagger UI: http://localhost:8080/swagger-ui.html

| Метод | Путь                 | Описание          |
| ----- | -------------------- | ----------------- |
| POST  | `/api/auth/register` | Регистрация       |
| POST  | `/api/auth/login`    | Логин (JWT)       |
| GET   | `/api/auth/me`       | Профиль по токену |
| GET   | `/health`            | Healthcheck       |
| GET   | `/api/categories`            | Справочник категорий (нужен токен) |
| GET   | `/api/subscriptions/me`      | Мои подписки (нужен токен) |
| POST  | `/api/subscriptions`         | Создать подписку (нужен токен) |
| PUT   | `/api/subscriptions/{id}`    | Обновить подписку (нужен токен) |
| DELETE| `/api/subscriptions/{id}`    | Удалить подписку (нужен токен) |
| PATCH | `/api/auth/change-password`  | Смена пароля (нужен токен) |

## Структура backend

Пакеты — по фичам:

- `auth/` — регистрация, логин, JWT, DTO, exceptions
- `user/` — entity `User`, репозиторий, exceptions
- `config/` — `SecurityConfig`, `OpenApiConfig`
- `security/` — `JwtAuthenticationFilter`, `CurrentUserService`
- `exception/` — `GlobalExceptionHandler`
- `dto/response/` — общие DTO (`ApiError`)
- `category/` — справочник категорий (Entity, Service, Controller)
- `subscription/` — CRUD подписок (Entity, Mapper, Service, Controller)

## Порты

| Сервис     | Порт хоста |
| ---------- | ---------- |
| Frontend   | 3000       |
| Backend    | 8080       |
| PostgreSQL | 5433       |

## Тестирование

### Интеграционные тесты backend

Интеграционные тесты находятся в каталоге `backend/src/test/java/ru/ivt/subscriptiontracker/app/` и проверяют
сценарии работы API с использованием **REST-Assured**.

#### Требования

- Установленная **Java 25** (проверить: `java -version`).
- Запущенный backend и база данных (например, через `docker compose up -d`).

#### Запуск

Из директории `backend`:

```sh
cd backend
mvn test
```

Запуск конкретных тестов:

```sh
# Только интеграционные тесты авторизации
mvn test -Dtest=AuthIntegrationTest

# Только healthcheck
mvn test -Dtest=HealthApiTest
```

## CI/CD

Для автоматической проверки, сборки и публикации приложения используются **GitHub Actions** и
**Cloud.ru Container Apps**.

### CI (Continuous Integration)

Для автоматической проверки изменений используются два GitHub Actions workflow: `Backend CI` и `Frontend CI`.

#### Запуск

Оба пайплайна запускаются при:
- `push` в ветку `master`;
- создании или обновлении Pull Request.

#### Backend CI

Выполняет проверки серверной части проекта.

1. **Checkout** — получение исходного кода.
2. **Setup JDK 25** — настройка Java 25 (Temurin) и кэша Maven.
3. **Docker permissions** — настройка доступа к Docker для Testcontainers.
4. **Build and Run Tests** — выполнение `mvn clean verify` в каталоге `backend`.
5. **Test Docker Build** — проверка сборки backend-образа командой `docker build`.

#### Frontend CI

Выполняет проверки клиентской части проекта.

1. **Checkout** — получение исходного кода.
2. **Setup Node.js 22** — настройка Node.js и кэша npm.
3. **Install dependencies** — установка зависимостей командой `npm ci`.
4. **Run tests** — запуск тестов командой `npm test`.
5. **TypeScript check** — проверка типов командой `npm run typecheck`.
6. **Build frontend** — production-сборка командой `npm run build`.

### CD (Continuous Delivery)

Для автоматической сборки и публикации Docker-образов используются два дополнительных workflow:
`Backend CD` и `Frontend CD`.

#### Запуск

CD-пайплайны запускаются автоматически после завершения соответствующего CI-пайплайна, если одновременно выполняются
условия:
- CI завершился успешно;
- исходное событие — `push` в ветку `master`.

Таким образом, публикация не выполняется при обычных запусках CI для Pull Request.

#### Backend CD

Выполняет следующие действия:

1. **Checkout** — получение исходного кода проверенного коммита.
2. **Login to Cloud.ru Artifact Registry** — авторизация в реестре Docker-образов Cloud.ru.
3. **Set up Docker Buildx** — настройка инструмента сборки Docker-образов.
4. **Build and push Backend image** — сборка backend-образа и публикация в Artifact Registry.

Для образа используются два тега:
- `latest` — последняя опубликованная версия;
- SHA коммита — идентификатор конкретной версии исходного кода.

#### Frontend CD

Выполняет аналогичные действия для клиентской части проекта:

1. **Checkout** — получение исходного кода проверенного коммита.
2. **Login to Cloud.ru Artifact Registry** — авторизация в реестре Docker-образов Cloud.ru.
3. **Set up Docker Buildx** — настройка инструмента сборки Docker-образов.
4. **Build and push frontend image** — сборка frontend-образа с production-конфигурацией Nginx и публикация в
5. Artifact Registry.

Для образа также используются теги `latest` и SHA коммита.

### Развёртывание приложения

Для запуска приложения используется **Cloud.ru Container Apps**.

- Backend и Frontend работают в отдельных Container Apps.
- Docker-образы хранятся в Cloud.ru Artifact Registry.
- Для обоих приложений настроен Auto Deployment с отслеживанием тега `latest`.
- После публикации нового образа с тегом `latest` Cloud.ru автоматически создаёт новую ревизию соответствующего
- приложения.

В качестве основной базы данных в production используется **Neon PostgreSQL**. Backend подключается к ней с помощью
переменных окружения.

### Линтеры и сканеры безопасности

Отдельные линтеры и сканеры безопасности в текущих CI-пайплайнах не настроены.

### Просмотр ошибок

Результаты выполнения CI/CD доступны в GitHub: **Actions → нужный workflow → нужный запуск**.

При ошибке откройте завершившийся с ошибкой шаг и изучите его логи.

Типичные ошибки:

- **Backend CI:**
  - `mvn clean verify` — ошибки компиляции, тестов или Maven;
  - `Testcontainers` — проблемы запуска тестовой БД или доступа к Docker;
  - `Test Docker Build` — ошибки сборки Docker-образа.

- **Frontend CI:**
  - `npm ci` — проблемы установки зависимостей;
  - `npm test` — ошибки тестов;
  - `npm run typecheck` — ошибки проверки типов;
  - `npm run build` — ошибки production-сборки.

- **Backend CD / Frontend CD:**
  - `Login to Cloud.ru Artifact Registry` — проблемы авторизации в реестре;
  - `Build and push ... image` — ошибки сборки или публикации Docker-образа.

Если CI завершился с ошибкой, соответствующий CD не запустится. Если CD завершился успешно, но приложение не
обновилось, следует проверить состояние Auto Deployment и ревизии в Cloud.ru Container Apps.

## Правила работы

См. [CONTRIBUTING.md](./CONTRIBUTING.md).

Кратко: `master` защищён, изменения через MR + 1 approve,
коммиты — Conventional Commits.

## Статус

**Готово:**

- Структура монорепозитория
- Spring Boot backend — регистрация, логин, JWT, `/me`
- React frontend — меню, роутинг, экран логина
- Docker Compose — backend + frontend + PostgreSQL
- Правила работы в [CONTRIBUTING.md](./CONTRIBUTING.md)

## Базы данных

В проекте используется реляционная СУБД PostgreSQL. Миграции схемы данных управляются автоматически при старте
бэкенда с помощью Flyway.

### Сущности и особенности архитектуры

`users` поле `email` имеет ограничение `UNIQUE` и используется как уникальный логин для авторизации.
`categories` изолированный глобальный справочник, общий для всех пользователей системы.
`subscriptions` бизнес-логика хранения подписок пользователей. Поле стоимости содержит ограничение
`CHECK (amount > 0)`.
Связь со справочником категорий защищена ограничением `ON DELETE RESTRICT` во избежание каскадного удаления данных
пользователей при администрировании категорий.
`notifications` журнал запланированных и отправленных оповещений. Связан строго с таблицей подписок с помощью
`ON DELETE CASCADE`.

Файлы миграций расположены по пути: `backend/src/main/resources/db/migration/`.

## Что появится в ближайшее время

- ML-сервис
- Полноценные уведомления (email/push)