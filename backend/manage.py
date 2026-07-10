#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Python 3.14 compatibility patch for Django 4.2 template context copying
try:
    from django.template.context import BaseContext
    def patch_django_context():
        def custom_copy(self):
            duplicate = self.__class__.__new__(self.__class__)
            duplicate.__dict__.update(self.__dict__)
            duplicate.dicts = self.dicts[:]
            return duplicate
        BaseContext.__copy__ = custom_copy
    patch_django_context()
except Exception:
    pass


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dms.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
