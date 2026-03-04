from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication


class ActivityJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if not result:
            return result

        user, validated_token = result
        now = timezone.now()

        should_update = user.last_seen is None or (now - user.last_seen).total_seconds() >= 30
        if should_update:
            user.last_seen = now
            user.save(update_fields=['last_seen'])

        return user, validated_token
