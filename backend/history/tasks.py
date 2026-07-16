from celery import shared_task
from django.core.management import call_command

@shared_task
def auto_prune_history():
    call_command('prune_history')
