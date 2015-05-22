# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('courses', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Submission',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, verbose_name='ID', serialize=False)),
                ('date', models.DateTimeField(auto_now_add=True, verbose_name='Время посылки')),
            ],
        ),
        migrations.AlterField(
            model_name='course',
            name='author',
            field=models.ForeignKey(related_name='courses', to=settings.AUTH_USER_MODEL, verbose_name='Автор'),
        ),
        migrations.AlterField(
            model_name='course',
            name='description',
            field=models.TextField(blank=True, verbose_name='Описание', default=''),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='course',
            field=models.ForeignKey(related_name='lessons', to='courses.Course', verbose_name='Курс'),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='description',
            field=models.TextField(blank=True, verbose_name='Описание', default=''),
        ),
        migrations.AlterField(
            model_name='problem',
            name='description',
            field=models.TextField(blank=True, verbose_name='Описание', default=''),
        ),
        migrations.AlterField(
            model_name='problem',
            name='lesson',
            field=models.ForeignKey(to='courses.Lesson', related_name='problems'),
        ),
        migrations.AddField(
            model_name='submission',
            name='problem',
            field=models.ForeignKey(related_name='submissions', to='courses.Problem', verbose_name='Задача'),
        ),
        migrations.AddField(
            model_name='submission',
            name='user',
            field=models.ForeignKey(related_name='submissions', to=settings.AUTH_USER_MODEL, verbose_name='Автор'),
        ),
    ]
