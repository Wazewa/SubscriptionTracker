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

Frontend доступен на http://localhost:3000, backend — на http://localhost:8080, health - на http://localhost:8080/health.
Swagger - http://localhost:8080/swagger-ui.html
Frontend пока отображает заглушку `Hello, Subscription Tracker!` и не требует API.

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
Переменные из `.env` нужны сервисам backend и PostgreSQL; для frontend-заглушки они не нужны.
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

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Логин (JWT) |
| GET | `/api/auth/me` | Профиль по токену |
| GET | `/health` | Healthcheck |


## Структура backend

Пакеты — по фичам:
- `auth/` — регистрация, логин, JWT, DTO, exceptions
- `user/` — entity `User`, репозиторий, exceptions
- `config/` — `SecurityConfig`, `OpenApiConfig`
- `security/` — `JwtAuthenticationFilter`
- `exception/` — `GlobalExceptionHandler`
- `dto/response/` — общие DTO (`ApiError`)

## Порты

| Сервис | Порт хоста |
|---|---|
| Frontend | 3000 |
| Backend | 8080 |
| PostgreSQL | 5433 |

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
В проекте используется реляционная СУБД PostgreSQL. Миграции схемы данных управляются автоматически при старте бэкенда с помощью Flyway.

### Сущности и особенности архитектуры
`users` поле `email` имеет ограничение `UNIQUE` и используется как уникальный логин для авторизации.
`categories` изолированный глобальный справочник, общий для всех пользователей системы.
`subscriptions` бизнес-логика хранения подписок пользователей. Поле стоимости содержит ограничение `CHECK (amount > 0)`.
Связь со справочником категорий защищена ограничением `ON DELETE RESTRICT` во избежание каскадного удаления данных пользователей при администрировании категорий.
`notifications` журнал запланированных и отправленных оповещений. Связан строго с таблицей подписок с помощью `ON DELETE CASCADE`.

Файлы миграций расположены по пути: `backend/src/main/resources/db/migration/`.

## Что появится в ближайшее время
- CRUD подписок
- Дашборд с аналитикой
- ML-сервис и бот
- Полноценные уведомления (email/push)
