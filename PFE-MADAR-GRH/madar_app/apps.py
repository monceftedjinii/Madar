from django.apps import AppConfig


class MainConfig(AppConfig):
    name = 'madar_app'
    
    def ready(self):
        """Register signals when the app is ready."""
        import madar_app.signals  # noqa
