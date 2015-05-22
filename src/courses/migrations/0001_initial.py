# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import yamlfield.fields
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Course',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, verbose_name='ID', serialize=False)),
                ('slug', models.SlugField(verbose_name='Слаг для адресной строки', unique=True)),
                ('name', models.CharField(verbose_name='Название', max_length=255)),
                ('description', models.TextField(default='', verbose_name='Описание')),
                ('public', models.BooleanField(default=False, verbose_name='Видно всем')),
                ('author', models.ForeignKey(verbose_name='Автор', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Lesson',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, verbose_name='ID', serialize=False)),
                ('slug', models.SlugField(verbose_name='Слаг для адресной строки')),
                ('name', models.CharField(verbose_name='Название', max_length=255)),
                ('description', models.TextField(default='', verbose_name='Описание')),
                ('contents', models.TextField(default='', verbose_name='Содержимое')),
                ('course', models.ForeignKey(verbose_name='Курс', to='courses.Course')),
            ],
        ),
        migrations.CreateModel(
            name='Problem',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, verbose_name='ID', serialize=False)),
                ('slug', models.SlugField(verbose_name='Слаг для адресной строки')),
                ('name', models.CharField(verbose_name='Название', max_length=255)),
                ('description', models.TextField(default='', verbose_name='Описание')),
                ('test_data', yamlfield.fields.YAMLField(default='', verbose_name='Тесты')),
                ('lesson', models.ForeignKey(to='courses.Lesson')),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='problem',
            unique_together=set([('lesson', 'slug')]),
        ),
        migrations.AlterOrderWithRespectTo(
            name='problem',
            order_with_respect_to='lesson',
        ),
        migrations.AlterUniqueTogether(
            name='lesson',
            unique_together=set([('course', 'slug')]),
        ),
        migrations.AlterOrderWithRespectTo(
            name='lesson',
            order_with_respect_to='course',
        ),
    ]
