from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_authorized_tools'),
    ]

    operations = [
        migrations.AlterField(
            model_name='useractivitylog',
            name='action',
            field=models.CharField(choices=[('LOGIN', 'Login'), ('LOGOUT', 'Logout'), ('FAILED_LOGIN', 'Failed Login'), ('SESSION_EXPIRED', 'Session Expired'), ('ADMIN_ACTION', 'Admin Action'), ('USER_CREATED', 'User Created'), ('USER_DELETED', 'User Deleted'), ('ROLE_CHANGED', 'Role Changed'), ('ACCOUNT_SUSPENDED', 'Account Suspended'), ('ACCOUNT_ACTIVATED', 'Account Activated'), ('PERMISSIONS_CHANGED', 'Permissions Changed')], max_length=20),
        ),
    ]
