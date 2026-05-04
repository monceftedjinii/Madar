from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from madar_app.models import Service, Employee, Position, Task, LeaveRequest, DocumentType, Notification
from datetime import datetime, timedelta
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo data for MADAR HR system with all roles and sample records'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # Create services (replaced departments)
        dept_it, _ = Service.objects.get_or_create(
            code='IT',
            defaults={'nomService': 'Information Technology', 'statut': 'ACTIF', 'budget': Decimal('500000.00')}
        )
        dept_hr, _ = Service.objects.get_or_create(
            code='HR',
            defaults={'nomService': 'Human Resources', 'statut': 'ACTIF', 'budget': Decimal('300000.00')}
        )
        dept_sales, _ = Service.objects.get_or_create(
            code='SALES',
            defaults={'nomService': 'Sales and Marketing', 'statut': 'ACTIF', 'budget': Decimal('400000.00')}
        )
        self.stdout.write(self.style.SUCCESS('✓ Services created'))

        # Create positions
        positions = {
            'Comptable': Position.objects.get_or_create(name='Comptable')[0],
            'Femme de ménage': Position.objects.get_or_create(name='Femme de ménage')[0],
            'Extra': Position.objects.get_or_create(name='Extra')[0],
            'Technicien': Position.objects.get_or_create(name='Technicien')[0],
            'Assistant RH': Position.objects.get_or_create(name='Assistant RH')[0],
            'Commercial': Position.objects.get_or_create(name='Commercial')[0],
            'Chef de service': Position.objects.get_or_create(name='Chef de service')[0],
            'Responsable RH': Position.objects.get_or_create(name='Responsable RH')[0],
            'Directeur RH': Position.objects.get_or_create(name='Directeur RH')[0],
        }
        self.stdout.write(self.style.SUCCESS('✓ Positions created'))

        # Create users with roles
        demo_users = {
            'emp@example.com': ('EMPLOYEE', 'emppass123', 'Employee', 'User'),
            'chef@example.com': ('CHEF', 'chefpass123', 'Chef', 'Manager'),
            'rh_simple@example.com': ('RH_SIMPLE', 'rhpass123', 'RH', 'Officer'),
            'grh@example.com': ('GRH', 'grhpass123', 'GRH', 'Director'),
        }

        created_users = {}
        for email, (role, password, first_name, last_name) in demo_users.items():
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'role': role,
                    'first_name': first_name,
                    'last_name': last_name,
                }
            )
            if created:
                user.set_password(password)
            user.save()
            created_users[email] = user

        self.stdout.write(self.style.SUCCESS('✓ Users created with roles'))

        # Create employees (database Employee records linked to services)
        emp_user = created_users['emp@example.com']
        emp, _ = Employee.objects.get_or_create(
            email='emp@example.com',
            defaults={
                'first_name': 'Employee',
                'last_name': 'User',
                'position': positions['Extra'],
                'service': dept_it,
                'hired_at': datetime.now().date(),
                'salary': Decimal('50000.00'),
            }
        )
        if not emp.attendance_pin:
            emp.attendance_pin = '1234'
            emp.save()

        chef_user = created_users['chef@example.com']
        chef_emp, _ = Employee.objects.get_or_create(
            email='chef@example.com',
            defaults={
                'first_name': 'Chef',
                'last_name': 'Manager',
                'position': positions['Chef de service'],
                'service': dept_sales,
                'hired_at': datetime.now().date(),
                'salary': Decimal('65000.00'),
            }
        )
        if not chef_emp.attendance_pin:
            chef_emp.attendance_pin = '1234'
            chef_emp.save()

        rh_simple_user = created_users['rh_simple@example.com']
        rh_simple_emp, _ = Employee.objects.get_or_create(
            email='rh_simple@example.com',
            defaults={
                'first_name': 'RH',
                'last_name': 'Officer',
                'position': positions['Assistant RH'],
                'service': dept_hr,
                'hired_at': datetime.now().date(),
                'salary': Decimal('60000.00'),
            }
        )
        if not rh_simple_emp.attendance_pin:
            rh_simple_emp.attendance_pin = '1234'
            rh_simple_emp.save()

        grh_user = created_users['grh@example.com']
        grh_emp, _ = Employee.objects.get_or_create(
            email='grh@example.com',
            defaults={
                'first_name': 'GRH',
                'last_name': 'Director',
                'position': positions['Directeur RH'],
                'service': dept_hr,
                'hired_at': datetime.now().date(),
                'salary': Decimal('90000.00'),
            }
        )
        if not grh_emp.attendance_pin:
            grh_emp.attendance_pin = '1234'
            grh_emp.save()

        self.stdout.write(self.style.SUCCESS('✓ Employees (demo users) created'))

        # Create some additional employees for testing
        for i in range(1, 3):
            Employee.objects.get_or_create(
                email=f'employee{i}@example.com',
                defaults={
                    'first_name': f'Employee{i}',
                    'last_name': f'Test',
                    'position': positions['Commercial'],
                    'service': dept_sales,
                    'hired_at': datetime.now().date(),
                    'salary': Decimal('55000.00'),
                }
            )

        Employee.objects.get_or_create(
            email='comptable@example.com',
            defaults={
                'first_name': 'Nadia',
                'last_name': 'Comptable',
                'position': positions['Comptable'],
                'service': dept_hr,
                'hired_at': datetime.now().date(),
                'salary': Decimal('58000.00'),
            }
        )

        Employee.objects.get_or_create(
            email='femme.menage@example.com',
            defaults={
                'first_name': 'Amina',
                'last_name': 'Service',
                'position': positions['Femme de ménage'],
                'service': dept_sales,
                'hired_at': datetime.now().date(),
                'salary': Decimal('32000.00'),
            }
        )

        Employee.objects.get_or_create(
            email='extra.staff@example.com',
            defaults={
                'first_name': 'Yassine',
                'last_name': 'Extra',
                'position': positions['Extra'],
                'service': dept_it,
                'hired_at': datetime.now().date(),
                'salary': Decimal('30000.00'),
            }
        )

        self.stdout.write(self.style.SUCCESS('✓ Additional demo employees created'))

        # Create sample task (Chef assigns to Employee)
        Task.objects.get_or_create(
            title='Sample Task',
            assigned_to=emp,
            defaults={
                'description': 'This is a sample task assigned by CHEF',
                'assigned_by': chef_user,
                'due_date': datetime.now().date() + timedelta(days=7),
                'status': 'TODO',
            }
        )

        self.stdout.write(self.style.SUCCESS('✓ Sample task created'))

        # Create sample leave request
        LeaveRequest.objects.get_or_create(
            employee=emp,
            start_date=datetime.now().date() + timedelta(days=5),
            end_date=datetime.now().date() + timedelta(days=7),
            defaults={
                'type': 'ANNUAL',
                'reason': 'Sample annual leave request',
                'status': 'PENDING',
            }
        )

        self.stdout.write(self.style.SUCCESS('✓ Sample leave request created'))

        # Create sample notification
        Notification.objects.get_or_create(
            user=emp_user,
            title='Welcome to MADAR',
            defaults={
                'message': 'Welcome to the MADAR HR Management System. This is a demo notification.',
                'is_read': False,
            }
        )

        self.stdout.write(self.style.SUCCESS('✓ Sample notification created'))

        self.stdout.write(self.style.SUCCESS('\n✓✓✓ Demo data seeding complete! ✓✓✓'))
        self.stdout.write('\nYou can now login with:')
        self.stdout.write('  EMPLOYEE: emp@example.com / emppass123')
        self.stdout.write('  CHEF:     chef@example.com / chefpass123')
        self.stdout.write('  RH_SIMPLE:     rh_simple@example.com / rhpass123')
        self.stdout.write('  GRH:      grh@example.com / grhpass123')

