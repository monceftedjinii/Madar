from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User, Department, Employee
from .models import Task
from .models import Attendance
from .models import LeaveRequest
from .models import AbsenceWarning, DisciplineFlag, Notification
from .models import DocumentType, Document, DocumentHistory


class CustomUserCreationForm(UserCreationForm):
	class Meta:
		model = User
		fields = ('email', 'role')


class CustomUserChangeForm(UserChangeForm):
	class Meta:
		model = User
		fields = ('email', 'role')


class UserAdmin(BaseUserAdmin):
	add_form = CustomUserCreationForm
	form = CustomUserChangeForm
	model = User
	list_display = ('email', 'role', 'is_staff', 'is_superuser')
	list_filter = ('role', 'is_staff')
	ordering = ('email',)
	search_fields = ('email',)
	fieldsets = (
		(None, {'fields': ('email', 'password', 'role')}),
		('Permissions', {'fields': ('is_staff', 'is_superuser', 'is_active')}),
	)
	add_fieldsets = (
		(None, {
			'classes': ('wide',),
			'fields': ('email', 'role', 'password1', 'password2', 'is_staff', 'is_superuser'),
		}),
	)


admin.site.register(User, UserAdmin)
admin.site.register(Department)
admin.site.register(Employee)
admin.site.register(Task)
admin.site.register(Attendance)
admin.site.register(LeaveRequest)
admin.site.register(AbsenceWarning)
admin.site.register(DisciplineFlag)
admin.site.register(Notification)
admin.site.register(DocumentType)
admin.site.register(Document)
admin.site.register(DocumentHistory)
