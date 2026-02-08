from django.test import TestCase

from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from django.contrib.auth import get_user_model
from .models import RoleChoices


class RBACTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		# create GRH user
		self.grh_email = 'admin@example.com'
		self.grh_password = 'ChangeMe123'
		User.objects.create_user(email=self.grh_email, password=self.grh_password, role=RoleChoices.GRH)

		# create non-GRH user
		self.user_email = 'user1@example.com'
		self.user_password = 'userpass123'
		User.objects.create_user(email=self.user_email, password=self.user_password, role=RoleChoices.EMPLOYEE)

		self.client = APIClient()

	def test_grh_can_access_rbac_test(self):
		logged = self.client.login(email=self.grh_email, password=self.grh_password)
		self.assertTrue(logged, 'GRH login failed in test')
		resp = self.client.get('/api/rbac-test/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		self.assertTrue(data.get('ok'))
		self.assertEqual(data.get('role'), RoleChoices.GRH)

	def test_non_grh_gets_forbidden(self):
		logged = self.client.login(email=self.user_email, password=self.user_password)
		self.assertTrue(logged, 'Non-GRH login failed in test')
		resp = self.client.get('/api/rbac-test/')
		self.assertEqual(resp.status_code, 403)


class JWTTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.email = 'jwtuser@example.com'
		self.password = 'jwtpass123'
		self.user = User.objects.create_user(email=self.email, password=self.password, role=RoleChoices.EMPLOYEE)

	def test_obtain_token_and_whoami(self):
		# obtain token
		resp = self.client.post('/api/auth/token/', {'email': self.email, 'password': self.password}, format='json')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		self.assertIn('access', data)
		token = data['access']

		# whoami without token -> 401
		resp2 = self.client.get('/api/whoami/')
		self.assertEqual(resp2.status_code, 401)

		# whoami with token -> 200
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp3 = self.client.get('/api/whoami/')
		self.assertEqual(resp3.status_code, 200)
		j = resp3.json()
		self.assertEqual(j.get('email'), self.email)
		self.assertEqual(j.get('role'), RoleChoices.EMPLOYEE)


class EmployeeScopeTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		# departments
		from .models import Department, Employee
		self.d1 = Department.objects.create(name='Dept A')
		self.d2 = Department.objects.create(name='Dept B')

		# employees in dept A
		self.a1 = Employee.objects.create(first_name='A', last_name='One', email='a1@example.com', hired_at='2020-01-01', department=self.d1, salary='1000')
		self.a2 = Employee.objects.create(first_name='A', last_name='Two', email='a2@example.com', hired_at='2020-01-01', department=self.d1, salary='1000')

		# employee in dept B
		self.b1 = Employee.objects.create(first_name='B', last_name='One', email='b1@example.com', hired_at='2020-01-01', department=self.d2, salary='1000')

		# chef user (in dept A)
		self.chef_email = 'chef@example.com'
		self.chef_pass = 'chefpass'
		User.objects.create_user(email=self.chef_email, password=self.chef_pass, role=RoleChoices.CHEF)
		Employee.objects.create(first_name='Chef', last_name='Guy', email=self.chef_email, hired_at='2020-01-01', department=self.d1, salary='2000')

		# grh user
		self.grh_email = 'grh2@example.com'
		self.grh_pass = 'grhpass'
		User.objects.create_user(email=self.grh_email, password=self.grh_pass, role=RoleChoices.GRH)

		# regular employee user mapped to a1
		self.emp_email = 'a1@example.com'
		self.emp_pass = 'emppass'
		User.objects.create_user(email=self.emp_email, password=self.emp_pass, role=RoleChoices.EMPLOYEE)

	def get_token(self, email, password):
		resp = self.client.post('/api/auth/token/', {'email': email, 'password': password}, format='json')
		self.assertEqual(resp.status_code, 200)
		return resp.json()['access']

	def test_grh_sees_all(self):
		token = self.get_token(self.grh_email, self.grh_pass)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/employees/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		# should see 4 employees (a1,a2,b1,chef)
		self.assertEqual(len(data), 4)

	def test_chef_sees_department(self):
		token = self.get_token(self.chef_email, self.chef_pass)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/employees/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		# dept A has a1, a2, chef -> 3
		self.assertEqual(len(data), 3)
		names = {d['full_name'] for d in data}
		self.assertIn('A One', names)
		self.assertIn('A Two', names)

	def test_employee_sees_only_self(self):
		token = self.get_token(self.emp_email, self.emp_pass)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/employees/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		self.assertEqual(len(data), 1)
		self.assertEqual(data[0]['full_name'], 'A One')


class TaskTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		from .models import Department, Employee, Task
		# departments
		self.d1 = Department.objects.create(name='Dept A')
		self.d2 = Department.objects.create(name='Dept B')

		# employees
		self.a1 = Employee.objects.create(first_name='A', last_name='One', email='a1@example.com', hired_at='2020-01-01', department=self.d1, salary='1000')
		self.b1 = Employee.objects.create(first_name='B', last_name='One', email='b1@example.com', hired_at='2020-01-01', department=self.d2, salary='1000')

		# chef in dept A
		self.chef = User.objects.create_user(email='chef2@example.com', password='chefpass', role=RoleChoices.CHEF)
		Employee.objects.create(first_name='Chef', last_name='Guy', email='chef2@example.com', hired_at='2020-01-01', department=self.d1, salary='2000')

		# employee user for a1
		self.emp = User.objects.create_user(email='a1@example.com', password='emppass', role=RoleChoices.EMPLOYEE)

		# other employee user for b1
		self.other = User.objects.create_user(email='b1@example.com', password='otherpass', role=RoleChoices.EMPLOYEE)

	def get_token(self, email, password):
		resp = self.client.post('/api/auth/token/', {'email': email, 'password': password}, format='json')
		self.assertEqual(resp.status_code, 200)
		return resp.json()['access']

	def test_chef_assigns_same_department(self):
		token = self.get_token('chef2@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		# assign to a1 (same dept)
		resp = self.client.post('/api/tasks/', {'title': 'Do X', 'assigned_to': self.a1.id}, format='json')
		self.assertEqual(resp.status_code, 201)

	def test_chef_assigns_other_department_forbidden(self):
		token = self.get_token('chef2@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		# assign to b1 (other dept)
		resp = self.client.post('/api/tasks/', {'title': 'Do Y', 'assigned_to': self.b1.id}, format='json')
		self.assertEqual(resp.status_code, 403)


class AttendanceTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		from .models import Department, Employee
		self.d = Department.objects.create(name='Dept A')
		# employee user and employee record
		self.email = 'att@example.com'
		self.password = 'attpass'
		self.user = User.objects.create_user(email=self.email, password=self.password, role=RoleChoices.EMPLOYEE)
		self.emp = Employee.objects.create(first_name='Att', last_name='User', email=self.email, hired_at='2020-01-01', department=self.d, salary='1000', attendance_pin='1234')

	def get_token(self):
		resp = self.client.post('/api/auth/token/', {'email': self.email, 'password': self.password}, format='json')
		self.assertEqual(resp.status_code, 200)
		return resp.json()['access']

	def test_check_in_creates_record(self):
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/attendance/check-in/', {'pin': '1234'}, format='json')
		self.assertIn(resp.status_code, (200, 201))
		data = resp.json()
		# check_in_time present
		self.assertIn('check_in_time', data)

	def test_check_in_wrong_pin_forbidden(self):
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/attendance/check-in/', {'pin': '0000'}, format='json')
		self.assertEqual(resp.status_code, 403)

	def test_check_in_missing_pin_bad_request(self):
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/attendance/check-in/', {}, format='json')
		self.assertEqual(resp.status_code, 400)

	def test_check_in_no_pin_set_bad_request(self):
		self.emp.attendance_pin = ''
		self.emp.save()
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/attendance/check-in/', {'pin': '1234'}, format='json')
		self.assertEqual(resp.status_code, 400)

	def test_check_out_requires_pin(self):
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		self.client.post('/api/attendance/check-in/', {'pin': '1234'}, format='json')
		resp = self.client.post('/api/attendance/check-out/', {'pin': '0000'}, format='json')
		self.assertEqual(resp.status_code, 403)

	def test_double_check_in_bad_request(self):
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp1 = self.client.post('/api/attendance/check-in/', {'pin': '1234'}, format='json')
		self.assertIn(resp1.status_code, (200, 201))
		resp2 = self.client.post('/api/attendance/check-in/', {'pin': '1234'}, format='json')
		self.assertEqual(resp2.status_code, 400)

	def test_check_out_after_check_in(self):
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		self.client.post('/api/attendance/check-in/', {'pin': '1234'}, format='json')
		resp = self.client.post('/api/attendance/check-out/', {'pin': '1234'}, format='json')
		self.assertEqual(resp.status_code, 200)
		self.assertIn('check_out_time', resp.json())

	def test_check_out_without_check_in(self):
		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/attendance/check-out/', {'pin': '1234'}, format='json')
		self.assertEqual(resp.status_code, 400)

	def test_list_returns_only_self(self):
		# create another employee and attendance
		from .models import Employee, Attendance
		other = Employee.objects.create(first_name='Other', last_name='User', email='other@example.com', hired_at='2020-01-01', department=self.d, salary='1000')
		Attendance.objects.create(employee=other, date='2026-02-01', check_in_time='08:00:00')

		token = self.get_token()
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/attendance/me/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		# should not include other's attendance
		for r in data:
			self.assertNotEqual(r['date'], '2026-02-01')



class LeaveRequestTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		from .models import Department, Employee, LeaveRequest
		# departments
		self.d1 = Department.objects.create(name='Dept A')
		self.d2 = Department.objects.create(name='Dept B')
	def test_employee_blocked_if_pending_leave(self):
		token = self.get_token('a1@example.com', 'emppass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		# Create a pending leave
		from .models import LeaveRequest
		LeaveRequest.objects.create(employee=self.a1, start_date='2026-03-10', end_date='2026-03-12', type=LeaveRequest.LeaveType.ANNUAL, status=LeaveRequest.Status.PENDING)
		# Try to create another leave
		resp = self.client.post('/api/leaves/', {'start_date': '2026-03-15', 'end_date': '2026-03-17', 'type': 'ANNUAL', 'reason': 'Blocked'}, format='json')
		self.assertEqual(resp.status_code, 400)
		self.assertIn('pending request', resp.json()['detail'])

	def test_employee_blocked_if_ongoing_accepted_leave(self):
		token = self.get_token('a1@example.com', 'emppass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		from .models import LeaveRequest
		from datetime import date, timedelta
		today = date.today()
		# Create an accepted leave ending in the future
		LeaveRequest.objects.create(employee=self.a1, start_date=today, end_date=today + timedelta(days=2), type=LeaveRequest.LeaveType.ANNUAL, status=LeaveRequest.Status.ACCEPTED)
		# Try to create another leave
		resp = self.client.post('/api/leaves/', {'start_date': str(today + timedelta(days=5)), 'end_date': str(today + timedelta(days=7)), 'type': 'ANNUAL', 'reason': 'Blocked'}, format='json')
		self.assertEqual(resp.status_code, 400)
		self.assertIn('ongoing approved leave', resp.json()['detail'])
		# employees
		self.a1 = Employee.objects.create(first_name='A', last_name='One', email='a1@example.com', hired_at='2020-01-01', department=self.d1, salary='1000')
		self.b1 = Employee.objects.create(first_name='B', last_name='One', email='b1@example.com', hired_at='2020-01-01', department=self.d2, salary='1000')

		# chef in dept A
		self.chef = User.objects.create_user(email='chef3@example.com', password='chefpass', role=RoleChoices.CHEF)
		Employee.objects.create(first_name='Chef', last_name='Guy', email='chef3@example.com', hired_at='2020-01-01', department=self.d1, salary='2000')

		# users for employees
		self.emp_user = User.objects.create_user(email='a1@example.com', password='emppass', role=RoleChoices.EMPLOYEE)
		self.other_user = User.objects.create_user(email='b1@example.com', password='otherpass', role=RoleChoices.EMPLOYEE)

	def get_token(self, email, password):
		resp = self.client.post('/api/auth/token/', {'email': email, 'password': password}, format='json')
		self.assertEqual(resp.status_code, 200)
		return resp.json()['access']

	def test_employee_create_annual_leave(self):
		token = self.get_token('a1@example.com', 'emppass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/leaves/', {'start_date': '2026-03-01', 'end_date': '2026-03-05', 'type': 'ANNUAL', 'reason': 'Vacation'}, format='json')
		self.assertEqual(resp.status_code, 201)
		from .models import Notification
		notifs = Notification.objects.filter(user=self.chef)
		self.assertGreater(notifs.count(), 0)

	def test_employee_create_sick_without_attachment_bad_request(self):
		token = self.get_token('a1@example.com', 'emppass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/leaves/', {'start_date': '2026-03-01', 'end_date': '2026-03-03', 'type': 'SICK', 'reason': 'Fever'}, format='multipart')
		self.assertEqual(resp.status_code, 400)

	def test_create_with_end_before_start_bad_request(self):
		token = self.get_token('a1@example.com', 'emppass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post('/api/leaves/', {'start_date': '2026-03-05', 'end_date': '2026-03-01', 'type': 'ANNUAL', 'reason': 'Backwards'}, format='json')
		self.assertEqual(resp.status_code, 400)

	def test_create_overlaps_existing_accepted_bad_request(self):
		from .models import LeaveRequest
		# create an accepted leave for a1 from 2026-03-10 to 2026-03-15
		accepted = LeaveRequest.objects.create(employee=self.a1, start_date='2026-03-10', end_date='2026-03-15', type=LeaveRequest.LeaveType.ANNUAL, status=LeaveRequest.Status.ACCEPTED)
		token = self.get_token('a1@example.com', 'emppass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		# attempt overlapping range
		resp = self.client.post('/api/leaves/', {'start_date': '2026-03-12', 'end_date': '2026-03-14', 'type': 'ANNUAL', 'reason': 'Overlap'}, format='json')
		self.assertEqual(resp.status_code, 400)

	def test_chef_lists_only_his_department_leaves(self):
		from .models import LeaveRequest
		# create leaves in both departments
		LeaveRequest.objects.create(employee=self.a1, start_date='2026-03-01', end_date='2026-03-02', type=LeaveRequest.LeaveType.ANNUAL)
		LeaveRequest.objects.create(employee=self.a1, start_date='2026-03-05', end_date='2026-03-06', type=LeaveRequest.LeaveType.ANNUAL, status=LeaveRequest.Status.ACCEPTED)
		LeaveRequest.objects.create(employee=self.b1, start_date='2026-03-03', end_date='2026-03-04', type=LeaveRequest.LeaveType.ANNUAL)

		token = self.get_token('chef3@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/leaves/department/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		# should include only dept A leaves (pending + accepted)
		self.assertEqual(len(data), 2)
		emails = {d['employee_email'] for d in data}
		self.assertEqual(emails, {'a1@example.com'})

	def test_chef_approves_request_in_dept(self):
		from .models import LeaveRequest
		lr = LeaveRequest.objects.create(employee=self.a1, start_date='2026-03-01', end_date='2026-03-02', type=LeaveRequest.LeaveType.ANNUAL)
		token = self.get_token('chef3@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post(f'/api/leaves/{lr.id}/approve/', {'comment': 'ok'}, format='json')
		self.assertEqual(resp.status_code, 200)
		lr.refresh_from_db()
		self.assertEqual(lr.status, LeaveRequest.Status.ACCEPTED)

	def test_chef_cannot_approve_other_dept(self):
		from .models import LeaveRequest
		lr = LeaveRequest.objects.create(employee=self.b1, start_date='2026-03-01', end_date='2026-03-02', type=LeaveRequest.LeaveType.ANNUAL)
		token = self.get_token('chef3@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post(f'/api/leaves/{lr.id}/approve/', {'comment': 'ok'}, format='json')
		self.assertEqual(resp.status_code, 403)

	def test_cannot_approve_non_pending(self):
		from .models import LeaveRequest
		lr = LeaveRequest.objects.create(employee=self.a1, start_date='2026-03-01', end_date='2026-03-02', type=LeaveRequest.LeaveType.ANNUAL, status=LeaveRequest.Status.ACCEPTED)
		token = self.get_token('chef3@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post(f'/api/leaves/{lr.id}/approve/', {'comment': 'ok'}, format='json')
		self.assertEqual(resp.status_code, 400)

	def test_chef_without_employee_record_gets_error(self):
		# Create CHEF user without Employee record
		User = get_user_model()
		chef_orphan = User.objects.create_user(email='orphan_chef@example.com', password='chefpass', role=RoleChoices.CHEF)
		# Note: Chef has User account but no Employee record linked
		
		token = self.get_token('orphan_chef@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/leaves/department/')
		self.assertEqual(resp.status_code, 400)
		self.assertIn('Chef has no Employee record', resp.json()['detail'])


class AbsenceDisciplineTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		from .models import Department, Employee, Attendance, LeaveRequest, AbsenceWarning, DisciplineFlag
		self.d = Department.objects.create(name='Dept A')
		# employee and user
		self.emp_email = 'absent@example.com'
		self.emp_pass = 'emppass'
		User.objects.create_user(email=self.emp_email, password=self.emp_pass, role=RoleChoices.EMPLOYEE)
		self.emp = Employee.objects.create(first_name='Absent', last_name='User', email=self.emp_email, hired_at='2020-01-01', department=self.d, salary='1000')
		# RH_SIMPLE and RH_SENIOR users
		self.rh_simple = User.objects.create_user(email='rhsimple@example.com', password='rhsimple', role=RoleChoices.RH_SIMPLE)
		self.rh_senior = User.objects.create_user(email='rhsenior@example.com', password='rhsenior', role=RoleChoices.RH_SENIOR)

	def get_token(self, email, password):
		resp = self.client.post('/api/auth/token/', {'email': email, 'password': password}, format='json')
		self.assertEqual(resp.status_code, 200)
		return resp.json()['access']

	def test_absence_detection_returns_employee_when_no_attendance_no_leave(self):
		from django.utils import timezone
		from datetime import timedelta
		yesterday = timezone.now().date() - timedelta(days=1)
		# ensure no attendance and no accepted leave
		token = self.get_token('rhsimple@example.com', 'rhsimple')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/absences/yesterday/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		emails = {e['full_name'] for e in data}
		self.assertIn('Absent User', emails)

	def test_absence_detection_excludes_if_attended(self):
		from django.utils import timezone
		from datetime import timedelta
		yesterday = timezone.now().date() - timedelta(days=1)
		from .models import Attendance
		Attendance.objects.create(employee=self.emp, date=yesterday, check_in_time='08:00:00')
		token = self.get_token('rhsimple@example.com', 'rhsimple')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/absences/yesterday/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		names = {e['full_name'] for e in data}
		self.assertNotIn('Absent User', names)

	def test_absence_detection_excludes_if_accepted_leave(self):
		from django.utils import timezone
		from datetime import timedelta
		yesterday = timezone.now().date() - timedelta(days=1)
		from .models import LeaveRequest
		LeaveRequest.objects.create(employee=self.emp, start_date=yesterday, end_date=yesterday, type=LeaveRequest.LeaveType.ANNUAL, status=LeaveRequest.Status.ACCEPTED)
		token = self.get_token('rhsimple@example.com', 'rhsimple')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/absences/yesterday/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		names = {e['full_name'] for e in data}
		self.assertNotIn('Absent User', names)

	def test_rh_simple_can_create_warning_and_no_duplicates_and_flag_on_third(self):
		from django.utils import timezone
		from datetime import timedelta
		today = timezone.now().date()
		# pick three days within current month
		month_start = today.replace(day=1)
		d1 = month_start + timedelta(days=1)
		d2 = month_start + timedelta(days=2)
		d3 = month_start + timedelta(days=3)
		# issue first warning
		token = self.get_token('rhsimple@example.com', 'rhsimple')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp1 = self.client.post('/api/warnings/', {'employee_id': self.emp.id, 'date': d1.isoformat(), 'comment': 'first'}, format='json')
		self.assertEqual(resp1.status_code, 201)
		# duplicate same day -> 400
		resp_dup = self.client.post('/api/warnings/', {'employee_id': self.emp.id, 'date': d1.isoformat(), 'comment': 'dup'}, format='json')
		self.assertEqual(resp_dup.status_code, 400)
		# second and third warnings
		resp2 = self.client.post('/api/warnings/', {'employee_id': self.emp.id, 'date': d2.isoformat(), 'comment': 'second'}, format='json')
		self.assertEqual(resp2.status_code, 201)
		resp3 = self.client.post('/api/warnings/', {'employee_id': self.emp.id, 'date': d3.isoformat(), 'comment': 'third'}, format='json')
		self.assertEqual(resp3.status_code, 201)
		# now flag should exist with warning_count >=3
		from .models import DisciplineFlag
		flag = DisciplineFlag.objects.get(employee=self.emp, month=month_start)
		self.assertGreaterEqual(flag.warning_count, 3)
		# RH_SENIOR sees flags
		token_sen = self.get_token('rhsenior@example.com', 'rhsenior')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_sen}')
		resp_flags = self.client.get('/api/discipline/flags/')
		self.assertEqual(resp_flags.status_code, 200)
		data = resp_flags.json()
		emails = {d['employee_email'] for d in data}
		self.assertIn(self.emp_email, emails)



class NotificationTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		from .models import Department, Employee, LeaveRequest
		# departments
		self.d1 = Department.objects.create(name='Dept A')
		# employee
		self.emp_email = 'notif@example.com'
		self.emp_pass = 'emppass'
		User.objects.create_user(email=self.emp_email, password=self.emp_pass, role=RoleChoices.EMPLOYEE)
		self.emp = Employee.objects.create(first_name='Notif', last_name='User', email=self.emp_email, hired_at='2020-01-01', department=self.d1, salary='1000')
		# chef
		self.chef = User.objects.create_user(email='chef4@example.com', password='chefpass', role=RoleChoices.CHEF)
		Employee.objects.create(first_name='Chef', last_name='Guy', email='chef4@example.com', hired_at='2020-01-01', department=self.d1, salary='2000')

	def get_token(self, email, password):
		resp = self.client.post('/api/auth/token/', {'email': email, 'password': password}, format='json')
		self.assertEqual(resp.status_code, 200)
		return resp.json()['access']

	def test_user_can_list_own_notifications(self):
		from .models import Notification
		User = get_user_model()
		# create notifications for the employee
		emp_user = User.objects.get(email=self.emp_email)
		Notification.objects.create(user=emp_user, title='Test 1', message='Test message 1')
		Notification.objects.create(user=emp_user, title='Test 2', message='Test message 2')
		
		token = self.get_token(self.emp_email, self.emp_pass)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.get('/api/notifications/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		self.assertEqual(len(data), 2)

	def test_cannot_read_others_notification(self):
		from .models import Notification
		User = get_user_model()
		# create notification for chef
		chef_user = User.objects.get(email='chef4@example.com')
		notif = Notification.objects.create(user=chef_user, title='Chef Only', message='Chef message')
		
		# employee tries to mark as read
		token = self.get_token(self.emp_email, self.emp_pass)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post(f'/api/notifications/{notif.id}/read/', {}, format='json')
		self.assertEqual(resp.status_code, 403)

	def test_notification_created_when_leave_approved(self):
		from .models import LeaveRequest
		User = get_user_model()
		emp_user = User.objects.get(email=self.emp_email)
		# create a leave request
		lr = LeaveRequest.objects.create(employee=self.emp, start_date='2026-03-01', end_date='2026-03-05', type=LeaveRequest.LeaveType.ANNUAL)
		
		# chef approves
		token = self.get_token('chef4@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post(f'/api/leaves/{lr.id}/approve/', {'comment': 'ok'}, format='json')
		self.assertEqual(resp.status_code, 200)
		
		# check notification was created for employee
		from .models import Notification
		notifs = Notification.objects.filter(user=emp_user)
		self.assertGreater(notifs.count(), 0)
		notif = notifs.first()
		self.assertIn('approved', notif.title.lower())

	def test_notification_created_when_leave_rejected(self):
		from .models import LeaveRequest
		User = get_user_model()
		emp_user = User.objects.get(email=self.emp_email)
		# create a leave request
		lr = LeaveRequest.objects.create(employee=self.emp, start_date='2026-03-01', end_date='2026-03-05', type=LeaveRequest.LeaveType.ANNUAL)
		
		# chef rejects
		token = self.get_token('chef4@example.com', 'chefpass')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post(f'/api/leaves/{lr.id}/reject/', {'comment': 'denied'}, format='json')
		self.assertEqual(resp.status_code, 200)
		
		# check notification was created for employee
		from .models import Notification
		notifs = Notification.objects.filter(user=emp_user)
		self.assertGreater(notifs.count(), 0)
		notif = notifs.first()
		self.assertIn('rejected', notif.title.lower())

	def test_notification_created_when_3rd_warning_issued(self):
		User = get_user_model()
		from django.utils import timezone
		from datetime import timedelta
		from .models import Notification
		# RH_SIMPLE and RH_SENIOR
		rh_simple = User.objects.create_user(email='rhsimple2@example.com', password='rhsimple', role=RoleChoices.RH_SIMPLE)
		rh_senior = User.objects.create_user(email='rhsenior2@example.com', password='rhsenior', role=RoleChoices.RH_SENIOR)
		
		today = timezone.now().date()
		month_start = today.replace(day=1)
		d1 = month_start + timedelta(days=1)
		d2 = month_start + timedelta(days=2)
		d3 = month_start + timedelta(days=3)
		
		# issue 3 warnings
		token = self.client.post('/api/auth/token/', {'email': 'rhsimple2@example.com', 'password': 'rhsimple'}, format='json').json()['access']
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		self.client.post('/api/warnings/', {'employee_id': self.emp.id, 'date': d1.isoformat(), 'comment': '1'}, format='json')
		self.client.post('/api/warnings/', {'employee_id': self.emp.id, 'date': d2.isoformat(), 'comment': '2'}, format='json')
		resp3 = self.client.post('/api/warnings/', {'employee_id': self.emp.id, 'date': d3.isoformat(), 'comment': '3'}, format='json')
		self.assertEqual(resp3.status_code, 201)
		
		# check RH_SENIOR was notified
		notifs = Notification.objects.filter(user=rh_senior)
		self.assertGreater(notifs.count(), 0)
		notif = notifs.first()
		self.assertIn('Discipline Flag', notif.title)

	def test_mark_notification_read(self):
		from .models import Notification
		User = get_user_model()
		emp_user = User.objects.get(email=self.emp_email)
		# create notification
		notif = Notification.objects.create(user=emp_user, title='Test', message='Test message')
		self.assertFalse(notif.is_read)
		
		# mark as read
		token = self.get_token(self.emp_email, self.emp_pass)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		resp = self.client.post(f'/api/notifications/{notif.id}/read/', {}, format='json')
		self.assertEqual(resp.status_code, 200)
		
		# verify is_read updated
		notif.refresh_from_db()
		self.assertTrue(notif.is_read)


class DocumentTests(APITestCase):
	"""Test suite for the Document MVP."""

	def setUp(self):
		User = get_user_model()
		from .models import Department, DocumentType, Employee
		
		# Create departments
		self.dept1 = Department.objects.create(name='Department 1')
		self.dept2 = Department.objects.create(name='Department 2')
		
		# Create employees
		self.emp_user = User.objects.create_user(
			email='emp@example.com',
			password='emppass123',
			role='EMPLOYEE'
		)
		self.emp_record = Employee.objects.create(
			first_name='John',
			last_name='Emp',
			email='emp@example.com',
			hired_at='2020-01-01',
			department=self.dept1,
			salary=30000
		)

		self.chef_user = User.objects.create_user(
			email='chef@example.com',
			password='chefpass123',
			role='CHEF'
		)
		self.chef_record = Employee.objects.create(
			first_name='Jane',
			last_name='Chef',
			email='chef@example.com',
			hired_at='2019-01-01',
			department=self.dept1,
			salary=40000
		)

		self.rh_simple_user = User.objects.create_user(
			email='rh_simple@example.com',
			password='rhpass123',
			role='RH_SIMPLE'
		)

		self.rh_senior_user = User.objects.create_user(
			email='rh_senior@example.com',
			password='rhspass123',
			role='RH_SENIOR'
		)

		self.grh_user = User.objects.create_user(
			email='grh@example.com',
			password='grhpass123',
			role='GRH'
		)

		# Create document types
		self.doc_type_rh = DocumentType.objects.create(name='RH Document', category='RH')
		self.doc_type_finance = DocumentType.objects.create(name='Finance Document', category='FINANCE')

	def get_token(self, email, password):
		"""Helper to get JWT token."""
		resp = self.client.post('/api/auth/token/', {
			'email': email,
			'password': password
		}, format='json')
		return resp.data['access']

	def test_employee_uploads_document(self):
		"""Employee can upload a document for their own department."""
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		from io import BytesIO
		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		self.assertEqual(resp.status_code, 201)
		self.assertEqual(resp.data['status'], 'DRAFT')

	def test_employee_cannot_upload_for_other_department(self):
		"""Employee cannot upload documents for a different department."""
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		from io import BytesIO
		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept2.id,
			'file': file_obj
		}, format='multipart')

		self.assertEqual(resp.status_code, 403)

	def test_employee_sees_own_documents_and_received_documents(self):
		"""Employee can list their own documents and documents sent to their department."""
		from io import BytesIO
		
		# Employee uploads a document
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'
		
		resp = self.client.post('/api/documents/', {
			'title': 'My Document',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')
		
		doc_id = resp.data['id']
		
		# Send the document
		resp = self.client.post(f'/api/documents/{doc_id}/send/', {})
		self.assertEqual(resp.status_code, 200)

		# Now employee lists their documents
		resp = self.client.get('/api/documents/me/')
		self.assertEqual(resp.status_code, 200)
		self.assertGreater(len(resp.data), 0)
		titles = [d['title'] for d in resp.data]
		self.assertIn('My Document', titles)

	def test_employee_cannot_see_unrelated_documents(self):
		"""Employee cannot see documents not created by them or sent to their department."""
		from io import BytesIO
		from .models import Employee
		
		# Chef uploads a document for dept2
		token = self.get_token('chef@example.com', 'chefpass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		# First create an employee in dept2
		emp2 = Employee.objects.create(
			first_name='Bob',
			last_name='Smith',
			email='emp2@example.com',
			hired_at='2021-01-01',
			department=self.dept2,
			salary=35000
		)
		user2 = get_user_model().objects.create_user(
			email='emp2@example.com',
			password='pass123',
			role='EMPLOYEE'
		)
		
		# Chef from dept1 cannot upload for dept2
		# So let's create a document in dept2 via GRH
		token_grh = self.get_token('grh@example.com', 'grhpass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_grh}')
		
		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'
		
		resp = self.client.post('/api/documents/', {
			'title': 'Dept2 Document',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept2.id,
			'file': file_obj
		}, format='multipart')
		
		doc_id = resp.data['id']
		
		# Now employee from dept1 tries to list documents
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		resp = self.client.get('/api/documents/me/')
		titles = [d['title'] for d in resp.data]
		self.assertNotIn('Dept2 Document', titles)

	def test_chef_sees_department_documents(self):
		"""Chef can see documents of their department."""
		from io import BytesIO
		
		# Employee uploads a document
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'
		
		resp = self.client.post('/api/documents/', {
			'title': 'Dept1 Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')
		
		# Chef lists documents
		token = self.get_token('chef@example.com', 'chefpass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		resp = self.client.get('/api/documents/me/')
		self.assertEqual(resp.status_code, 200)
		titles = [d['title'] for d in resp.data]
		self.assertIn('Dept1 Doc', titles)

	def test_rh_simple_can_only_upload_rh_documents(self):
		"""RH_SIMPLE can only upload RH category documents."""
		token = self.get_token('rh_simple@example.com', 'rhpass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		from io import BytesIO
		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		# Try uploading finance document (should fail)
		resp = self.client.post('/api/documents/', {
			'title': 'Finance Doc',
			'doc_type': self.doc_type_finance.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		self.assertEqual(resp.status_code, 403)

	def test_send_document_transitions_status(self):
		"""Sending a document transitions it from DRAFT to SENT."""
		from io import BytesIO
		
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		# Upload
		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		doc_id = resp.data['id']

		# Send
		resp = self.client.post(f'/api/documents/{doc_id}/send/', {})
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(resp.data['status'], 'SENT')

	def test_rh_senior_can_validate(self):
		"""RH_SENIOR can validate documents."""
		from io import BytesIO
		
		# Employee creates and sends a document
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		doc_id = resp.data['id']

		resp = self.client.post(f'/api/documents/{doc_id}/send/', {})

		# RH_SENIOR validates
		token = self.get_token('rh_senior@example.com', 'rhspass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		resp = self.client.post(f'/api/documents/{doc_id}/validate/', {})
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(resp.data['status'], 'VALIDATED')

	def test_non_rh_senior_cannot_validate(self):
		"""Non-RH_SENIOR cannot validate documents."""
		from io import BytesIO
		
		# Employee creates a document
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		doc_id = resp.data['id']

		# Employee tries to validate (should fail)
		resp = self.client.post(f'/api/documents/{doc_id}/validate/', {})
		self.assertEqual(resp.status_code, 403)

	def test_validating_creates_history_entry(self):
		"""Validating a document creates a DocumentHistory entry."""
		from io import BytesIO
		
		# Create and send a document
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		doc_id = resp.data['id']
		
		resp = self.client.post(f'/api/documents/{doc_id}/send/', {})

		# RH_SENIOR validates
		token = self.get_token('rh_senior@example.com', 'rhspass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		resp = self.client.post(f'/api/documents/{doc_id}/validate/', {})

		# Check history
		from .models import Document, DocumentHistory
		doc = Document.objects.get(id=doc_id)
		history = doc.history.filter(action='VALIDATED').first()
		self.assertIsNotNone(history)
		self.assertEqual(history.by_user.email, 'rh_senior@example.com')

	def test_comment_document_creates_history(self):
		"""Adding a comment to a document creates a COMMENTED history entry."""
		from io import BytesIO
		
		# Employee creates a document
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		doc_id = resp.data['id']

		# Comment
		resp = self.client.post(f'/api/documents/{doc_id}/comment/', {
			'comment': 'This is a test comment'
		})

		self.assertEqual(resp.status_code, 200)

		# Check history
		from .models import Document, DocumentHistory
		doc = Document.objects.get(id=doc_id)
		history = doc.history.filter(action='COMMENTED').first()
		self.assertIsNotNone(history)
		self.assertEqual(history.note, 'This is a test comment')

	def test_archive_document(self):
		"""RH_SENIOR can archive a document."""
		from io import BytesIO
		
		# Create and send a document
		token = self.get_token('emp@example.com', 'emppass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		file_obj = BytesIO(b'test file content')
		file_obj.name = 'test.txt'

		resp = self.client.post('/api/documents/', {
			'title': 'Test Doc',
			'doc_type': self.doc_type_rh.id,
			'source_department': self.dept1.id,
			'file': file_obj
		}, format='multipart')

		doc_id = resp.data['id']
		
		resp = self.client.post(f'/api/documents/{doc_id}/send/', {})

		# RH_SENIOR archives
		token = self.get_token('rh_senior@example.com', 'rhspass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

		resp = self.client.post(f'/api/documents/{doc_id}/archive/', {})
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(resp.data['status'], 'ARCHIVED')


class ReportsTests(APITestCase):
	"""Test suite for Reports & Statistics MVP."""

	def setUp(self):
		User = get_user_model()
		from .models import Department, Employee, DocumentType, Attendance, LeaveRequest, AbsenceWarning
		
		# Create departments
		self.dept1 = Department.objects.create(name='Dept 1')
		self.dept2 = Department.objects.create(name='Dept 2')
		
		# Create employee users
		self.emp_user = User.objects.create_user(
			email='emp@example.com',
			password='pass123',
			role='EMPLOYEE'
		)
		self.emp_record = Employee.objects.create(
			first_name='John',
			last_name='Emp',
			email='emp@example.com',
			hired_at='2020-01-01',
			department=self.dept1,
			salary=30000
		)
		
		# Create chef user
		self.chef_user = User.objects.create_user(
			email='chef@example.com',
			password='pass123',
			role='CHEF'
		)
		self.chef_record = Employee.objects.create(
			first_name='Jane',
			last_name='Chef',
			email='chef@example.com',
			hired_at='2019-01-01',
			department=self.dept1,
			salary=40000
		)
		
		# Create GRH user
		self.grh_user = User.objects.create_user(
			email='grh@example.com',
			password='pass123',
			role='GRH'
		)

	def get_token(self, email, password):
		"""Helper to get JWT token."""
		resp = self.client.post('/api/auth/token/', {
			'email': email,
			'password': password
		}, format='json')
		return resp.data['access']

	def test_employee_sees_only_own_counts(self):
		"""Employee sees only their own data in report."""
		from .models import Attendance
		from datetime import date
		
		# Create some data for the employee
		Attendance.objects.create(
			employee=self.emp_record,
			date=date.today(),
			check_in_time='09:00:00'
		)
		
		token = self.get_token('emp@example.com', 'pass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		resp = self.client.get('/api/reports/summary/')
		self.assertEqual(resp.status_code, 200)
		
		# Employee sees count of 1
		self.assertEqual(resp.data['attendance_days_count'], 1)
		self.assertEqual(resp.data['employees_count'], 1)

	def test_chef_sees_only_department_counts(self):
		"""Chef sees only their department's data."""
		from .models import Attendance
		from datetime import date
		
		# Create attendance for dept1
		Attendance.objects.create(
			employee=self.emp_record,
			date=date.today(),
			check_in_time='09:00:00'
		)
		
		# Create attendance for dept2 (via another employee)
		from .models import Employee
		emp2 = Employee.objects.create(
			first_name='Bob',
			last_name='Emp2',
			email='emp2@example.com',
			hired_at='2021-01-01',
			department=self.dept2,
			salary=35000
		)
		Attendance.objects.create(
			employee=emp2,
			date=date.today(),
			check_in_time='09:00:00'
		)
		
		# Chef of dept1 should see only 1 attendance
		token = self.get_token('chef@example.com', 'pass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		resp = self.client.get('/api/reports/summary/')
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(resp.data['attendance_days_count'], 1)
		self.assertEqual(resp.data['employees_count'], 2)  # Chef + 1 employee in dept1

	def test_grh_sees_global_counts(self):
		"""GRH sees all data across all departments."""
		from .models import Attendance, Employee
		from datetime import date
		
		# Create attendance for dept1
		Attendance.objects.create(
			employee=self.emp_record,
			date=date.today(),
			check_in_time='09:00:00'
		)
		
		# Create employee in dept2 and their attendance
		emp2 = Employee.objects.create(
			first_name='Bob',
			last_name='Emp2',
			email='emp2@example.com',
			hired_at='2021-01-01',
			department=self.dept2,
			salary=35000
		)
		Attendance.objects.create(
			employee=emp2,
			date=date.today(),
			check_in_time='09:00:00'
		)
		
		# GRH should see both
		token = self.get_token('grh@example.com', 'pass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		resp = self.client.get('/api/reports/summary/')
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(resp.data['attendance_days_count'], 2)

	def test_report_includes_all_metrics(self):
		"""Report includes all expected metrics."""
		token = self.get_token('grh@example.com', 'pass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		resp = self.client.get('/api/reports/summary/')
		self.assertEqual(resp.status_code, 200)
		
		# Check presence of all keys
		expected_keys = [
			'employees_count',
			'attendance_days_count',
			'absences_detected_count',
			'warnings_count',
			'discipline_flags_count',
			'leaves_pending_count',
			'leaves_accepted_count',
			'leaves_refused_count',
			'documents_created_count',
			'documents_validated_count',
			'from',
			'to',
			'user_role'
		]
		for key in expected_keys:
			self.assertIn(key, resp.data)

	def test_date_filter_works(self):
		"""Report respects from/to date filters."""
		from .models import Attendance
		from datetime import date, timedelta
		
		today = date.today()
		yesterday = today - timedelta(days=1)
		
		# Create attendance today
		Attendance.objects.create(
			employee=self.emp_record,
			date=today,
			check_in_time='09:00:00'
		)
		
		# Create attendance yesterday
		Attendance.objects.create(
			employee=self.emp_record,
			date=yesterday,
			check_in_time='09:00:00'
		)
		
		token = self.get_token('grh@example.com', 'pass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		# Query only today
		resp = self.client.get(f'/api/reports/summary/?from={today}&to={today}')
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(resp.data['attendance_days_count'], 1)

	def test_leaves_counts_by_status(self):
		"""Report shows leave counts by status (pending/accepted/refused)."""
		from .models import LeaveRequest
		from datetime import date, timedelta
		
		today = date.today()
		tomorrow = today + timedelta(days=1)
		
		# Create pending leave
		LeaveRequest.objects.create(
			employee=self.emp_record,
			start_date=today,
			end_date=tomorrow,
			type='ANNUAL',
			status='PENDING'
		)
		
		# Create accepted leave
		LeaveRequest.objects.create(
			employee=self.emp_record,
			start_date=today,
			end_date=tomorrow,
			type='ANNUAL',
			status='ACCEPTED'
		)
		
		token = self.get_token('grh@example.com', 'pass123')
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
		
		resp = self.client.get('/api/reports/summary/')
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(resp.data['leaves_pending_count'], 1)
		self.assertEqual(resp.data['leaves_accepted_count'], 1)
		self.assertEqual(resp.data['leaves_refused_count'], 0)