from django.conf.urls import patterns, include, url
from django.contrib import admin

urlpatterns = patterns('',
    # Examples:
    url(r'^$', 'courses.views.index', name='index'),
    url(
        r'^courses/(?P<course_slug>[-a-zA-Z0-9_]+)/(?P<lesson_slug>[-a-zA-Z0-9_]+)/$',
        'courses.views.lesson',
        name='lesson',
    ),
    url(
        r'^courses/(?P<course_slug>[-a-zA-Z0-9_]+)/(?P<lesson_slug>[-a-zA-Z0-9_]+)/(?P<problem_slug>[-a-zA-Z0-9_]+)/$',
        'courses.views.problem',
        name='problem',
    ),
    url(
        r'^courses/(?P<course_slug>[-a-zA-Z0-9_]+)/(?P<lesson_slug>[-a-zA-Z0-9_]+)/(?P<problem_slug>[-a-zA-Z0-9_]+)/submissions/$',
        'courses.views.create_submission',
        name='create_submission',
    ),
    url(
        r'^courses/(?P<course_slug>[-a-zA-Z0-9_]+)/(?P<lesson_slug>[-a-zA-Z0-9_]+)/(?P<problem_slug>[-a-zA-Z0-9_]+)/submissions/(?P<id>[0-9]+)/$',
        'courses.views.get_submission',
        name='get_submission',
    ),
    # url(r'^blog/', include('blog.urls')),

    url(r'^admin/', include(admin.site.urls)),
)
