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
6. Смержи через **squash** — один коммит на MR

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
- Java 25, Spring Boot 4
- 4 пробела, отступы по IDEA default
- Форматирование перед коммитом

Frontend:
- React + TypeScript, Vite, Tailwind CSS.
- Node.js 22.12+ (ветка 22), npm; `package-lock.json` коммитим.
- Установка зависимостей: `cd frontend` и `npm ci`.
- Разработка: `npm run dev`; проверка типов: `npm run typecheck`.
- Перед MR: `npm run build` и проверка страницы в браузере.
- Отступы 2 пробела; компоненты в PascalCase, переменные в camelCase.
- `node_modules/`, `dist/` и секреты в Git не добавляем.
