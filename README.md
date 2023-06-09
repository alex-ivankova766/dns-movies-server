# dns-movies-server

## Подготовка переменных среды:

- Создать файл .env в корне проекта, на одном уровне с docker-compose файлом. 
- Скопировать в него все переменные из .env.example: 

*Примечание:*

    API_GATEWAY_PORT - внешний порт для работы с сервером. По умолчанию 5000. К этому порту будете подключаться, то есть к http://localhost:5000

## Пробуем запускать докер

В докере есть 2 основные сущности - образы (images) и контейнеры (containers). Образ представляет собой как бы подготовленную (скомпилированную, сбилженную) виртуальную систему с **фиксированными** настройками, а контейнер - это система в запущенном состоянии.

Для запуска сервера необходимо сначала сделать образы, а потом их запустить (сначала сделать образы а потом контейнеры на их основе). Непосредственно в контейнерах и будут находиться микросервисы.

## Билдим образы

Находясь в папке с docker-compose файлом вводим в консоли команду
```yml
docker compose build
```
Увидим логи в консоли. Все должно быть чистенько.

## Делаем из образов контейнеры

```yml
docker compose --profile dev up
```
Для разработки
```yml
docker compose --profile test up
```
для тестировки

Тут могут появляться красные строки, это иногда нормально, если некоторые сервисы при запуске обогнали другие и временно не могут подключиться.

На самом деле можно сразу запускать docker compose up но у меня, например, слабый интернет и иногда контейнер не успевает прогрузить нпм пакеты и вылетает по таймауту, поэтому предпочитаю делать по очереди.

Процесс может быть долгим, во время запуска также происходит заполнение базы данными о фильмах и персонале.

Когда будет выполнена команда, то можно проверить, что все контейнеры запущены и в них нет ошибок.

## Проверка контейнеров

В программе docker-desktop (я надеюсь пользуетесь ей) слева сверху переходим в раздел **контейнеры**. Раскрываем список и видим 7 позиций:
- rabbitmq      <--- обязательный,
- postgres      <--- обязательный, база
- api           <--- обязательный, главная точка входа
- users         <--- для теста авторизации
- auth          <--- для теста авторизации
- persons       <--- для теста персонала и фильмов
- movies        <--- для теста персонала и фильмов

    
        Обратите внимание, что эти 7 сервисов соответствую 7ми блокам из файла docker-compose

Первые 2 должны работать без ошибок, все остальное - наши микросервисы.

На каждый контейнер можно нажать и посмотреть логи, убедиться, что там нет красных сообщений об ошибках.

В случае чего контейнеры, образы и волумы можно в той же программе удалить и пересобрать заново.

## Запуск **не** всех контейнеров

Сервисы можно запускать изолированно, для чего необходимо закомментировать ненужные блоки в `docker-compose`. Например, тестируем только авторизацию, тогда комментируем блоки `persons` и `movies`, а также убираем их названия из `depends_on` в блоке `api`.

## Остановка контейнеров
производится командой 
```yml
ctrl+C
```

# Работа с фильами и персоналом

## Рабочие эндпоинты:

---

Пагинация:
```
/api/movies?page=0&size=10 
``` 
*устанавливает отображаемый лимит и страницу*

---

Для поиска фильма по любому из полей:

```
/api/movies?name=гарри
``` 
*ищет только в поле`nameRu`*

---

Так же будет работать и с пагинацией:

```
/api/movies?size=10&page=1&name=гарри
```

**Регистр не важен!**

---

Фильтры:
```
/api/movies/filters?page=0&size=10&genreId=1&countryId=1&year=2000
```
Подробнее о возможностях фильтрации в config файле.

---

Автосаджест:
```
/api/movies/:name
```
только на русском языке

# Работа с авторизацией
Данный раздел включает также пользователей и роли.

Возможные интерфейсы описаны в документации на странице http://localhost:5000/api/docs при запущенном в контейнере сервере, если вы не меняли API-GATEWAY порт с 5000 на что-то еще.

Сначала необходимо создать суперадминистратора - владельца сервера, отправив запрос на эндпоинт /api/init . Только после этого станет доступна регистрация и другие функции.