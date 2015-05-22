# -*- coding: utf-8 -*-
from django.db import models
from django.contrib.auth.models import User

from yamlfield.fields import YAMLField


class RespectedOrder(object):
    @property
    def order(self):
        """
        Order from order_with_respect_to, starts from 1

        :rtype: int
        """
        return self._order + 1


class Course(models.Model):
    slug = models.SlugField(verbose_name="Слаг для адресной строки", unique=True)
    name = models.CharField(verbose_name="Название", max_length=255)
    description = models.TextField(verbose_name="Описание", default='', blank=True)
    author = models.ForeignKey(User, verbose_name="Автор", related_name='courses')
    public = models.BooleanField(verbose_name="Видно всем", default=False)

    def __str__(self):
        return '<{slug}> {name}'.format(slug=self.slug, name=self.name)


class Lesson(RespectedOrder, models.Model):
    course = models.ForeignKey(Course, verbose_name="Курс", related_name='lessons')
    slug = models.SlugField(verbose_name="Слаг для адресной строки")
    name = models.CharField(verbose_name="Название", max_length=255)
    description = models.TextField(verbose_name="Описание", default='', blank=True)
    contents = models.TextField(verbose_name="Содержимое", default='')

    class Meta:
        order_with_respect_to = 'course'
        unique_together = ('course', 'slug')

    def __str__(self):
        return '<{course_slug}/{slug}> {course_name} - {name}'.format(
            course_slug=self.course.slug, course_name=self.course.name,
            slug=self.slug, name=self.name,
        )


class Problem(RespectedOrder, models.Model):
    lesson = models.ForeignKey(Lesson, related_name='problems')
    slug = models.SlugField(verbose_name="Слаг для адресной строки")
    name = models.CharField(verbose_name="Название", max_length=255)
    description = models.TextField(verbose_name="Описание", default='', blank=True)
    test_data = YAMLField(verbose_name="Тесты", default='')

    class Meta:
        order_with_respect_to = 'lesson'
        unique_together = ('lesson', 'slug')


class Submission(models.Model):
    user = models.ForeignKey(User, verbose_name="Автор", related_name='submissions')
    problem = models.ForeignKey(Problem, verbose_name="Задача", related_name='submissions')
    date = models.DateTimeField(verbose_name="Время посылки", auto_now_add=True)
    code = models.TextField(verbose_name="Код")

    class Meta:
        ordering = ('-date',)

    def date_string(self):
        return self.date.strftime('%d-%m-%Y %H:%M:%S')
