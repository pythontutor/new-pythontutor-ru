# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_auto_20150523_1502'),
    ]

    operations = [
        migrations.AddField(
            model_name='submission',
            name='code',
            field=models.TextField(default='', verbose_name='Код'),
            preserve_default=False,
        ),
    ]
