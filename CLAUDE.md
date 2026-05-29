# CalPFC — дневник питания

## Запуск сервера

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "C:\Users\Павел\Desktop\calpfc" -WindowStyle Hidden
```

Сервер → http://localhost:3000  
При старте новой сессии сервер не запущен — нужно запустить.

## Стек

- **Backend:** Node.js + Express + PostgreSQL (pg) + dotenv
- **Frontend:** Vanilla JS (без фреймворков), CSS custom properties, тёмная тема
- **БД:** PostgreSQL 18, путь `D:\Program Files\PostgreSQL\18\`, база `calpfc`, пользователь `postgres`, пароль `oslos2007`
- **GitHub:** https://github.com/ptrincher-sketch/calpfc (ветка `main`)

## Авторизация

- Логин admin: `admin` / `admin123`
- Токен хранится в localStorage (`calpfc_token` и `calpfc_user`)
- Bearer-заголовок добавляется через `api.js` во все запросы
- При загрузке страницы — автопроверка через `GET /api/auth/me`

## Структура файлов

```
calpfc/
├── server.js          # Express-сервер, все API-маршруты
├── db.js              # Подключение к PG, init() создаёт таблицы
├── .env               # PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD, PORT
└── public/
    ├── index.html     # Дневник питания (главная)
    ├── catalog.html   # Справочник продуктов
    ├── dishes.html    # Справочник блюд
    ├── style.css      # Единый CSS для всех страниц
    ├── utils.js       # toast(), esc(), syncCreatorColumn(), initSharedUI()
    ├── macros.js      # Числовые инпуты с ▲▼, cursor-aware шаг
    ├── api.js         # apiGet/apiPost/apiPut/apiDel с Authorization
    ├── auth.js        # Логин/логаут, кнопка «Вход»
    ├── app.js         # Дневник: автокомплит, CRUD, сортировка, фильтр по дате
    ├── catalog.js     # Продукты: CRUD, сортировка, дропдаун, уникальность
    └── dishes.js      # Блюда: CRUD + состав с процентами, авторасчёт КБЖУ
```

Порядок загрузки скриптов (важен!): `utils.js → macros.js → api.js → auth.js → page.js`

## Таблицы PostgreSQL

```sql
users            -- id, username, password_hash, token, created_at
foods            -- id, name, calories, protein, fat, carbs, created_by→users, created_at
dishes           -- id, name, calories, protein, fat, carbs, user_id→users, created_at
dish_ingredients -- id, dish_id→dishes CASCADE, food_id→foods, percent
diary            -- id, name, weight, calories, protein, fat, carbs, date, user_id→users, created_at
```

## API

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/foods` | Продукты (admin: все; user: свои + без владельца) |
| POST/PUT/DELETE | `/api/foods/:id` | CRUD продукта |
| GET | `/api/dishes` | Блюда (та же фильтрация) |
| GET | `/api/dishes/:id/ingredients` | Состав блюда |
| POST/PUT/DELETE | `/api/dishes/:id` | CRUD блюда (транзакция) |
| GET | `/api/diary` | Дневник (`?date=YYYY-MM-DD` или `?all=1`; admin видит всех) |
| POST/DELETE | `/api/diary/:id` | Добавить / удалить запись |
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход → token |
| GET | `/api/auth/me` | Проверить токен |
| POST | `/api/auth/logout` | Выход |

## Ключевые паттерны

- **Видимость данных:** admin видит всё; user — только своё + записи без владельца (created_by IS NULL)
- **Колонка «Добавил»:** добавляется динамически через `syncCreatorColumn()` только для admin
- **Числовые поля КБЖУ:** `input[data-macro]`, инициализируются через `initMacroInputs()` в macros.js; все П/Ж/У отображаются с 1 знаком после запятой
- **Сортировка таблиц:** `data-col` на `<th>`, CSS-классы `sort-asc`/`sort-desc`, индикаторы ▲▼
- **Дневник:** выбор даты или галка «все даты»; колонка «Дата» видна только admin при «все даты»; формат дат дд.мм.гггг; сортировка по любой колонке, по умолчанию по created_at asc
- **Кнопка входа:** `position: fixed`, правый верхний угол (`top:1rem; right:1.5rem; z-index:300`)
- **Cache-Control: no-store** — на все JS/CSS чтобы браузер не кешировал

## Правила работы

- После изменений server.js — перезапускать сервер (см. команду запуска выше)
