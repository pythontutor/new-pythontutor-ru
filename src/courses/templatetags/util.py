from math import ceil

from django import template


register = template.Library()


@register.filter
def chunks(data, chunk_count):
    """
    Split `data` to `chunk_count` chunks

    :type data: list or tuple
    :type chunk_count: str
    :rtype: generator
    """
    if not data:
        data = []

    chunk_count = int(chunk_count)
    chunksize = int(ceil(len(data) / chunk_count))

    return (data[i * chunksize:i * chunksize + chunksize] for i in range(chunk_count))


@register.filter
def inc(value, step='1'):
    """
    Increment value
    :type value: int
    :type step: str
    """
    return value + int(step)
