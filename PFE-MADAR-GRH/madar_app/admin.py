from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.html import format_html
from .models import User, Department, Employee, Position
from .models import Task
from .models import Attendance
from .models import LeaveRequest
from .models import AbsenceWarning, DisciplineFlag, Notification
from .models import DocumentType, Document, DocumentHistory
from .models import Message, MessageAttachment, Draft, BlockedUser, MessageReport, Announcement, MessagingSettings
import secrets



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
admin.site.register(Position)


class EmployeeAdmin(admin.ModelAdmin):
	list_display = ('email', 'first_name', 'last_name', 'position', 'department', 'attendance_pin', 'user_status')
	search_fields = ('email', 'first_name', 'last_name', 'position__name')
	list_filter = ('department', 'position')
	fields = ('first_name', 'last_name', 'email', 'position', 'department', 'hired_at', 'salary', 'attendance_pin', 'user_login_info')
	readonly_fields = ('user_login_info',)
	actions = ['reset_user_password']

	def user_status(self, obj):
		"""Display if employee has a User account."""
		try:
			user = User.objects.get(email=obj.email)
			return format_html(
				'<span style="color: green;">✓ User</span>'
			)
		except User.DoesNotExist:
			return format_html(
				'<span style="color: red;">✗ No User</span>'
			)
	user_status.short_description = 'Login Status'

	def user_login_info(self, obj):
		"""Display employee's login information."""
		try:
			user = User.objects.get(email=obj.email)
			return format_html(
				'<div style="background: #e8f4f8; padding: 12px; border-radius: 4px;">'
				'<strong>Email:</strong> {}<br>'
				'<strong>Login:</strong> Use email + password set by admin<br>'
				'<em>To reset password: Select employee and use "Reset user password" action below</em>'
				'</div>',
				user.email
			)
		except User.DoesNotExist:
			return format_html(
				'<div style="background: #f8e8e8; padding: 12px; border-radius: 4px;">'
				'<em>No User account - will be created when saved</em>'
				'</div>'
			)
	user_login_info.short_description = 'User Account Information'

	def reset_user_password(self, request, queryset):
		"""Admin action to reset user password."""
		updated_count = 0
		for employee in queryset:
			try:
				user = User.objects.get(email=employee.email)
				# Generate new temporary password
				new_password = secrets.token_urlsafe(12)
				user.set_password(new_password)
				user.save()
				updated_count += 1
				# Print to console so admin can see it
				print(f"[ADMIN] Reset password for {user.email}: {new_password}")
				self.message_user(request, f'✓ Reset password for {employee.email} to: {new_password}')
			except User.DoesNotExist:
				self.message_user(request, f'✗ No User account for {employee.email}', level='error')
		
		# Show final message
		msg = f'Password reset for {updated_count} employee(s). Check browser notifications for passwords.'
		self.message_user(request, msg)
	reset_user_password.short_description = 'Reset user password(s)'


admin.site.register(Employee, EmployeeAdmin)
admin.site.register(Task)
admin.site.register(Attendance)
admin.site.register(LeaveRequest)
admin.site.register(AbsenceWarning)
admin.site.register(DisciplineFlag)
admin.site.register(Notification)
admin.site.register(DocumentType)
admin.site.register(Document)
admin.site.register(DocumentHistory)


# ============================================================
# MODULE 10: INTERNAL MESSAGING
# ============================================================

class MessageAttachmentInline(admin.TabularInline):
	model = MessageAttachment
	extra = 0


class MessageAdmin(admin.ModelAdmin):
	list_display = ('sender', 'recipient', 'subject', 'is_read', 'is_reply', 'is_forward', 'created_at')
	search_fields = ('sender__email', 'recipient__email', 'subject', 'body')
	list_filter = ('is_read', 'is_reply', 'is_forward', 'created_at')
	readonly_fields = ('created_at', 'updated_at')
	inlines = [MessageAttachmentInline]
	fieldsets = (
		('Message Info', {'fields': ('sender', 'recipient', 'subject', 'body')}),
		('Status', {'fields': ('is_read', 'is_reply', 'is_forward', 'parent_message')}),
		('Deleted Status', {'fields': ('is_deleted_by_sender', 'is_deleted_by_recipient')}),
		('Timestamps', {'fields': ('created_at', 'updated_at')}),
	)


admin.site.register(Message, MessageAdmin)


class DraftAdmin(admin.ModelAdmin):
	list_display = ('creator', 'recipient', 'subject', 'updated_at')
	search_fields = ('creator__email', 'recipient__email', 'subject')
	list_filter = ('created_at', 'updated_at')
	readonly_fields = ('created_at', 'updated_at')


admin.site.register(Draft, DraftAdmin)


class BlockedUserAdmin(admin.ModelAdmin):
	list_display = ('blocker', 'blocked', 'created_at')
	search_fields = ('blocker__email', 'blocked__email')
	list_filter = ('created_at',)


admin.site.register(BlockedUser, BlockedUserAdmin)


class MessageReportAdmin(admin.ModelAdmin):
	list_display = ('message', 'reporter', 'reason', 'is_resolved', 'created_at')
	search_fields = ('reporter__email', 'reason', 'description')
	list_filter = ('is_resolved', 'created_at', 'sender_blocked', 'message_hidden')
	readonly_fields = ('created_at', 'resolved_at', 'message')
	fieldsets = (
		('Report', {'fields': ('message', 'reporter', 'reason', 'description')}),
		('Resolution', {'fields': ('is_resolved', 'resolved_by', 'resolution_note')}),
		('Actions', {'fields': ('message_hidden', 'sender_blocked')}),
		('Timestamps', {'fields': ('created_at', 'resolved_at')}),
	)


admin.site.register(MessageReport, MessageReportAdmin)


class AnnouncementAdmin(admin.ModelAdmin):
	list_display = ('title', 'creator', 'scope', 'target_department', 'created_at')
	search_fields = ('title', 'message', 'creator__email')
	list_filter = ('scope', 'created_at')
	readonly_fields = ('created_at',)
	fieldsets = (
		('Announcement', {'fields': ('title', 'message', 'creator')}),
		('Distribution', {'fields': ('scope', 'target_department')}),
		('Timestamps', {'fields': ('created_at',)}),
	)


admin.site.register(Announcement, AnnouncementAdmin)


class MessagingSettingsAdmin(admin.ModelAdmin):
	list_display = ('max_attachment_size_mb', 'blocking_enabled', 'announcements_global_default')
	readonly_fields = ('updated_at',)
	fieldsets = (
		('File Attachments', {'fields': ('max_attachment_size_mb', 'allowed_file_extensions')}),
		('Features', {'fields': ('blocking_enabled', 'announcements_global_default')}),
		('Timestamps', {'fields': ('updated_at',)}),
	)

	def has_add_permission(self, request):
		return not MessagingSettings.objects.exists()

	def has_delete_permission(self, request, obj=None):
		return False


admin.site.register(MessagingSettings, MessagingSettingsAdmin)
