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
Frontend содержит меню, авторизацию, Dashboard и страницу подписок. Для регистрации и входа требуется backend; подписки пока проверяются на явно обозначенных демо-данных в режиме разработки. Подготовка API списка и ограничения описаны в [frontend/SUBSCRIPTIONS.md](frontend/SUBSCRIPTIONS.md).

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
Переменные из `.env` нужны сервисам backend и PostgreSQL. Для сборки frontend секреты не требуются; API списка подписок пока выключен до согласования контракта.
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

Интеграционные тесты находятся в каталоге `backend/src/test/java/ru/ivt/subscriptiontracker/app/` и проверяют сценарии работы API с использованием **REST-Assured**.

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

- Дашборд с аналитикой
- ML-сервис и бот
- Полноценные уведомления (email/push)
