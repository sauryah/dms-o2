from django.apps import AppConfig


class DiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dies'

    def ready(self):
        import dies.signals
        from search.meili import init_meilisearch
        init_meilisearch()

