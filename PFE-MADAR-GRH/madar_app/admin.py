from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.html import format_html
from django import forms
from .models import (
	User, Employee, Position, Job, Service, Affectation,
	ServiceChoices, EmployeeRoleChoices, RoleChoices
)
from .models import Task
from .models import Attendance
from .models import LeaveType, LeaveRequest, SoldeConge, ValidationWorkflow
from .models import AbsenceWarning, DisciplineFlag, Notification
from .models import DocumentType, Document, DocumentHistory, DocumentVersion, DocumentValidation, DocumentAccess
from .models import Message, MessageAttachment, Draft, BlockedUser, MessageReport, Announcement, MessagingSettings
import secrets


class EmployeeRoleForm(forms.ModelForm):
	"""Custom form that shows conditional role choices based on user's service."""
	
	class Meta:
		model = Employee
		fields = '__all__'
	
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		
		# Get the related user to check their service
		if self.instance and self.instance.email:
			try:
				user = User.objects.get(email=self.instance.email)
				# If user is in RH service, show RH-specific roles
				if user.service == ServiceChoices.RH:
					self.fields['role'].choices = [
						('', '---------'),
						(EmployeeRoleChoices.RH, EmployeeRoleChoices.RH.label),
						(EmployeeRoleChoices.RH_FORMATION, EmployeeRoleChoices.RH_FORMATION.label),
						(EmployeeRoleChoices.RH_CONGE, EmployeeRoleChoices.RH_CONGE.label),
						(EmployeeRoleChoices.DRH, EmployeeRoleChoices.DRH.label),
					]
				else:
					# For non-RH users, show only EMPLOYEE or CHEF
					self.fields['role'].choices = [
						('', '---------'),
						(EmployeeRoleChoices.EMPLOYEE, EmployeeRoleChoices.EMPLOYEE.label),
						(EmployeeRoleChoices.CHEF, EmployeeRoleChoices.CHEF.label),
					]
			except User.DoesNotExist:
				# If no user found, show all roles
				pass
	
	def clean(self):
		"""Validate that the role is appropriate for the user's service."""
		cleaned_data = super().clean()
		role = cleaned_data.get('role')
		
		if self.instance and self.instance.email and role:
			try:
				user = User.objects.get(email=self.instance.email)
				# RH roles should only be assigned to RH service users
				rh_roles = {EmployeeRoleChoices.RH, EmployeeRoleChoices.RH_FORMATION, EmployeeRoleChoices.RH_CONGE, EmployeeRoleChoices.DRH}
				if role in rh_roles and user.service != ServiceChoices.RH:
					raise forms.ValidationError(f"RH roles can only be assigned to users in RH service.")
				# Non-RH roles should only be assigned to non-RH users
				if role in {EmployeeRoleChoices.EMPLOYEE, EmployeeRoleChoices.CHEF} and user.service == ServiceChoices.RH:
					raise forms.ValidationError(f"EMPLOYEE/CHEF roles can only be assigned to non-RH users.")
			except User.DoesNotExist:
				raise forms.ValidationError("User not found for this employee email.")
		
		return cleaned_data



class CustomUserCreationForm(UserCreationForm):
	class Meta:
		model = User
		fields = ('email', 'service')


class CustomUserChangeForm(UserChangeForm):
	class Meta:
		model = User
		fields = ('email', 'role', 'service')


class UserAdmin(BaseUserAdmin):
	add_form = CustomUserCreationForm
	form = CustomUserChangeForm
	model = User
	list_display = ('email', 'service', 'role', 'is_staff', 'is_superuser')
	list_filter = ('service', 'is_staff')
	ordering = ('email',)
	search_fields = ('email',)
	fieldsets = (
		(None, {'fields': ('email', 'password')}),
		('Department Assignment', {'fields': ('service',)}),
		('Legacy Role (Backward Compat)', {'fields': ('role',), 'classes': ('collapse',)}),
		('Permissions', {'fields': ('is_staff', 'is_superuser', 'is_active')}),
	)
	add_fieldsets = (
		(None, {
			'classes': ('wide',),
			'fields': ('email', 'service', 'password1', 'password2', 'is_staff', 'is_superuser'),
		}),
	)


admin.site.register(User, UserAdmin)
admin.site.register(Position)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
	list_display = ('intitule', 'niveauHierarchique', 'estManagerial', 'nbrPostes', 'salaire_range', 'posteParentId')
	list_filter = ('niveauHierarchique', 'estManagerial')
	search_fields = ('intitule', 'posteParentId__intitule')
	ordering = ('niveauHierarchique', 'intitule')
	fieldsets = (
		('Informations de base', {
			'fields': ('intitule', 'niveauHierarchique', 'estManagerial', 'nbrPostes')
		}),
		('Salaire', {
			'fields': ('salaireMini', 'salaireMaxi')
		}),
		('Hiérarchie', {
			'fields': ('posteParentId',)
		}),
	)
	readonly_fields = ('created_at', 'updated_at')

	def salaire_range(self, obj):
		"""Display salary range in list view"""
		return f"${obj.salaireMini:,.0f} - ${obj.salaireMaxi:,.0f}"
	salaire_range.short_description = 'Salaire'


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
	list_display = ('code', 'nomService', 'statut', 'budget', 'serviceParentId', 'service_hierarchy')
	list_filter = ('statut',)
	search_fields = ('code', 'nomService')
	ordering = ('code',)
	fieldsets = (
		('Informations de base', {
			'fields': ('code', 'nomService', 'statut')
		}),
		('Données financières', {
			'fields': ('budget',)
		}),
		('Hiérarchie', {
			'fields': ('serviceParentId',)
		}),
	)
	
	def service_hierarchy(self, obj):
		"""Display the full hierarchy path"""
		hierarchy = []
		current = obj
		while current:
			hierarchy.insert(0, current.code)
			current = current.serviceParentId
		return ' → '.join(hierarchy)
	service_hierarchy.short_description = 'Hiérarchie'


@admin.register(Affectation)
class AffectationAdmin(admin.ModelAdmin):
	list_display = ('employee', 'job', 'dateDebut', 'dateFin', 'typeAffectation', 'estPrimaire', 'status_badge', 'motif')
	list_filter = ('typeAffectation', 'estPrimaire', 'dateDebut')
	search_fields = ('employee__first_name', 'employee__last_name', 'job__intitule', 'motif')
	ordering = ('employee', '-estPrimaire', '-dateDebut')
	fieldsets = (
		('Assignation', {
			'fields': ('employee', 'job')
		}),
		('Période', {
			'fields': ('dateDebut', 'dateFin')
		}),
		('Détails', {
			'fields': ('typeAffectation', 'motif', 'estPrimaire')
		}),
		('Audit', {
			'fields': ('created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)
	readonly_fields = ('created_at', 'updated_at')

	def status_badge(self, obj):
		"""Display current/inactive status with color"""
		if obj.get_current_assignment():
			return format_html(
				'<span style="background-color: #28a745; color: white; padding: 3px 8px; border-radius: 3px;">Active</span>'
			)
		return format_html(
			'<span style="background-color: #6c757d; color: white; padding: 3px 8px; border-radius: 3px;">Inactive</span>'
		)
	status_badge.short_description = 'Statut'


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
	form = EmployeeRoleForm
	list_display = ('email', 'first_name', 'last_name', 'phone_number', 'profile_preview', 'position', 'contract_type', 'user_service_display', 'role', 'attendance_pin', 'user_status')
	search_fields = ('email', 'first_name', 'last_name', 'phone_number', 'address', 'position__name')
	list_filter = ('role', 'position', 'contract_type')
	fields = ('first_name', 'last_name', 'email', 'phone_number', 'address', 'profile_picture', 'profile_preview', 'position', 'contract_type', 'user_service_display', 'role', 'hired_at', 'salary', 'attendance_pin', 'user_login_info')
	readonly_fields = ('profile_preview', 'user_login_info', 'hired_at', 'user_service_display')
	actions = ['reset_user_password']

	def user_service_display(self, obj):
		"""Display the employee's related user's service department."""
		try:
			user = User.objects.get(email=obj.email)
			if user.service:
				return format_html(
					'<span style="background-color: #007bff; color: white; padding: 4px 8px; border-radius: 3px;">{}</span>',
					user.get_service_display() if hasattr(user, 'get_service_display') else user.service
				)
			return format_html('<span style="color: #999;">Not assigned</span>')
		except User.DoesNotExist:
			return format_html('<span style="color: #ccc;">No user</span>')
	user_service_display.short_description = 'User Service/Department'

	def profile_preview(self, obj):
		if obj.profile_picture:
			return format_html('<img src="{}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 50%;" />', obj.profile_picture.url)
		return '-'
	profile_preview.short_description = 'Photo'

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


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
	list_display = ('code', 'libelle', 'nbrJoursDroit', 'estPayant', 'reconductible', 'delaiPreavis', 'justificatifRequis', 'sexeAutorise')
	list_filter = ('estPayant', 'reconductible', 'justificatifRequis', 'sexeAutorise')
	search_fields = ('code', 'libelle')
	ordering = ('code',)
	fieldsets = (
		('Informations de base', {
			'fields': ('code', 'libelle', 'sexeAutorise')
		}),
		('Droits et règles', {
			'fields': ('nbrJoursDroit', 'estPayant', 'reconductible')
		}),
		('Contraintes', {
			'fields': ('delaiPreavis', 'justificatifRequis')
		}),
		('Audit', {
			'fields': ('created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)
	readonly_fields = ('created_at', 'updated_at')


@admin.register(SoldeConge)
class SoldeCongeAdmin(admin.ModelAdmin):
	list_display = ('employee', 'leaveType', 'annee', 'joursAcquis', 'joursPris', 'joursReportes', 'joursRestants', 'derniereMaj')
	list_filter = ('annee', 'leaveType')
	search_fields = ('employee__first_name', 'employee__last_name', 'leaveType__libelle')
	ordering = ('employee', 'leaveType', '-annee')
	fieldsets = (
		('Références', {
			'fields': ('employee', 'leaveType', 'annee')
		}),
		('Balance', {
			'fields': ('joursAcquis', 'joursPris', 'joursReportes', 'joursRestants')
		}),
		('Audit', {
			'fields': ('derniereMaj', 'created_at'),
			'classes': ('collapse',)
		}),
	)
	readonly_fields = ('derniereMaj', 'created_at')
	actions = ['recalculate_balances']

	def recalculate_balances(self, request, queryset):
		"""Admin action to recalculate selected leave balances"""
		count = 0
		for solde in queryset:
			solde.calculer()
			count += 1
		self.message_user(request, f"{count} solde(s) de congé recalculé(s) avec succès.")
	recalculate_balances.short_description = "Recalculer les soldes sélectionnés"


@admin.register(ValidationWorkflow)
class ValidationWorkflowAdmin(admin.ModelAdmin):
	list_display = ('leave_request', 'validation_order', 'validator_role', 'validator', 'decision', 'is_active', 'decided_at')
	list_filter = ('decision', 'is_active', 'validator_role')
	search_fields = ('leave_request__employee__first_name', 'leave_request__employee__last_name', 'validator__email')
	ordering = ('leave_request', 'validation_order')
	readonly_fields = ('created_at', 'updated_at', 'decided_at')


admin.site.register(Task)
admin.site.register(Attendance)
admin.site.register(LeaveRequest)
admin.site.register(AbsenceWarning)
admin.site.register(DisciplineFlag)
admin.site.register(Notification)
admin.site.register(DocumentType)
admin.site.register(Document)
admin.site.register(DocumentHistory)


class DocumentVersionAdmin(admin.ModelAdmin):
	list_display = ('document', 'numVersion', 'author', 'size', 'checksum', 'is_current', 'created_at')
	list_filter = ('is_current', 'created_at')
	search_fields = ('document__title', 'author__first_name', 'author__last_name', 'comment')
	readonly_fields = ('checksum', 'created_at',)
	ordering = ('-created_at',)


admin.site.register(DocumentVersion, DocumentVersionAdmin)


class DocumentValidationAdmin(admin.ModelAdmin):
	list_display = ('document', 'step_order', 'validator', 'status', 'is_active', 'validation_date', 'created_at')
	list_filter = ('status', 'is_active', 'validation_date', 'created_at')
	search_fields = ('document__title', 'validator__first_name', 'validator__last_name', 'comment')
	readonly_fields = ('created_at', 'updated_at', 'validation_date')
	ordering = ('document', 'step_order')
	fieldsets = (
		('Workflow Info', {
			'fields': ('document', 'step_order', 'validator', 'is_active')
		}),
		('Validation Decision', {
			'fields': ('status', 'validation_date', 'comment', 'signature')
		}),
		('Timestamps', {
			'fields': ('created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)


admin.site.register(DocumentValidation, DocumentValidationAdmin)


class DocumentAccessAdmin(admin.ModelAdmin):
	list_display = ('document', 'user', 'action', 'result', 'ip_address', 'access_datetime')
	list_filter = ('action', 'result', 'access_datetime')
	search_fields = ('document__title', 'user__email', 'user__first_name', 'user__last_name', 'ip_address', 'details')
	readonly_fields = ('access_datetime',)
	ordering = ('-access_datetime',)
	date_hierarchy = 'access_datetime'
	
	def has_add_permission(self, request):
		# Access logs should only be created programmatically
		return False
	
	def has_change_permission(self, request, obj=None):
		# Access logs should not be modified once created
		return False


admin.site.register(DocumentAccess, DocumentAccessAdmin)


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
	list_display = ('title', 'creator', 'scope', 'target_service', 'created_at')
	search_fields = ('title', 'message', 'creator__email')
	list_filter = ('scope', 'created_at')
	readonly_fields = ('created_at',)
	fieldsets = (
		('Announcement', {'fields': ('title', 'message', 'creator')}),
		('Distribution', {'fields': ('scope', 'target_service')}),
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
