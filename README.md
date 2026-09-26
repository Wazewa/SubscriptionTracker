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

## Запуск

### Первый запуск

1. Скопируй `.env.example` в `.env`
2. Сгенерируй JWT-секрет
3. Запусти одной командой `docker compose up -d --build`

## Статус

Проект в стадии активной разработки. Скелет бэкенда готов, остальные компоненты в работе.

## Что появится в ближайшее время
- Эндпоинты авторизации и CRUD подписок
- Расширение `docker-compose.yml`: frontend, ml, bot

Следите за обновлениями — README будет дополняться по мере готовности компонентов.