# new-pythontutor-ru

Новая версия pythontutor.ru

# Основные фичи:
* независимость от той части кода, которая запускает присылаемый пользователем код (см. [evaler-pythontutor-ru](https://github.com/pythontutor/evaler-pythontutor-ru))
* как следствие, отсутствие необходимости в Vagrant и возможность разрабатываться локально на любой ОС
* material design
* markdown-разметка уроков и задач
* yaml-разметка тестовых данных
* все уроки и задачи хранятся в бд
* и многое другое

# Для разработчика(для Mac и Linux)
## Подготовка среды
* форкнуть репозиторий к себе
* склонировать форк и перейти в папку с ним
* сделать virtualenv с Python 3: `virtualenv --python="$(which python3)" venv`
* активировать virtualenv: `source venv/bin/activate`
* поставить зависимости: `pip install -r requirements.txt`
* перейти в папку `src`
* создать бд: `./manage.py migrate`
* создать пользователя: `./manage.py createsuperuser`

## Запуск сервера
* `./manage.py runserver` - по умолчанию он запустится на 8000 порту

## Contribution
* TODO: ide, git, отдельные ветки, тесты, пулреквесты
