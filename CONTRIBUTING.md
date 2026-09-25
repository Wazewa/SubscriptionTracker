# Contributing

## Ветки

- `master` — стабильная, защищена
- `feature/<краткое-описание>` — новая функциональность
- `fix/<краткое-описание>` — исправление бага
- `chore/<краткое-описание>` — рутина (рефакторинг, зависимости, инфра)
- Ветки короткие, живут 1-3 дня, потом мерж

## Коммиты

Используем [Conventional Commits](https://www.conventionalcommits.org/):

<type>: <краткое описание в императиве>

Примеры:
- feat: add user registration endpoint
- fix: correct next payment date calculation
- chore: update spring boot to 3.3.1
- docs: update README with setup instructions
- test: add integration tests for auth

Типы:
- feat — новая функциональность
- fix — исправление бага
- chore — рутина, не влияет на продукт
- docs — только документация
- test — только тесты
- refactor — изменение кода без изменения поведения

Правила:
- Описание на английском, lowercase после двоеточия
- В императиве: "add", не "added" или "adds"
- Одна строка до 72 символов, детали — в теле коммита
- Не смешивать в одном коммите разные типы изменений

## Pull Request / Merge Request

1. Создай ветку от свежего `master`
2. Сделай изменения, покрой тестами
3. Локально прогони `mvn verify` (для backend)
4. Открой MR в `master`
5. Дождись 1 approve
6. Смержи (squash или merge — договоримся)

## Перед MR

- [ ] Тесты зелёные локально
- [ ] Нет `TODO` без тикета
- [ ] Обновлён README/ADR, если нужно
- [ ] `.env` не попал в коммит
- [ ] Коммиты по Conventional Commits

## Что не коммитить

- `.env` и любые секреты
- `target/`, `node_modules/`, `dist/`
- `.idea/`, `*.iml`, `.vscode/`
- Локальные конфиги

## Стиль кода

Backend:
- Java 21, Spring Boot 3
- 4 пробела, отступы по IDEA default
- Форматирование перед коммитом

Frontend: TBD (фронтендер дополнит)