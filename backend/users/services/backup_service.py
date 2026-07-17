import os
import subprocess
from typing import Dict, Any, Optional
from django.conf import settings
from users.models import UserSession
from search.tasks import rebuild_search_index_task
from django.utils import timezone

class BackupService:
    @staticmethod
    def get_backup_dir() -> str:
        return '/backups'

    @staticmethod
    def list_backups() -> list:
        backup_dir = BackupService.get_backup_dir()
        if not os.path.exists(backup_dir):
            return []

        backups = []
        for filename in os.listdir(backup_dir):
            if filename.endswith('.dump'):
                filepath = os.path.join(backup_dir, filename)
                stat = os.stat(filepath)
                backups.append({
                    'filename': filename,
                    'size_kb': round(stat.st_size / 1024, 2),
                    'created_at': stat.st_mtime
                })

        return sorted(backups, key=lambda x: x['created_at'], reverse=True)

    @staticmethod
    def prune_old_backups(days=14) -> None:
        backup_dir = BackupService.get_backup_dir()
        if not os.path.exists(backup_dir):
            return

        seconds_in_days = days * 24 * 60 * 60
        current_time = timezone.now().timestamp()

        for f in os.listdir(backup_dir):
            if f.endswith('.dump'):
                fp = os.path.join(backup_dir, f)
                stat = os.stat(fp)
                if (current_time - stat.st_mtime) > seconds_in_days:
                    try:
                        os.remove(fp)
                    except OSError:
                        pass

    @staticmethod
    def create_backup() -> str:
        db_name = settings.DATABASES['default']['NAME']
        db_user = settings.DATABASES['default']['USER']
        db_password = settings.DATABASES['default']['PASSWORD']
        db_host = settings.DATABASES['default']['HOST']
        db_port = settings.DATABASES['default']['PORT']

        backup_dir = BackupService.get_backup_dir()
        os.makedirs(backup_dir, exist_ok=True)

        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"dms_backup_{timestamp}.dump"
        filepath = os.path.join(backup_dir, filename)

        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        cmd = [
            'pg_dump',
            '-h', db_host,
            '-p', str(db_port),
            '-U', db_user,
            '-F', 'c',
            '-f', filepath,
            db_name
        ]

        try:
            subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f"pg_dump failed: {e.stderr or e}")

        # Verify backup file is non-empty and valid
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            raise Exception("Backup file is empty or was not created")
        try:
            verify_cmd = [
                'pg_restore',
                '-h', db_host,
                '-p', str(db_port),
                '-U', db_user,
                '-f', '/dev/null',
                '--data-only',
                '--list',
                filepath
            ]
            result = subprocess.run(verify_cmd, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"Backup integrity check failed: {result.stderr}")
        except FileNotFoundError:
            pass

        BackupService.prune_old_backups()
        return filename

    @staticmethod
    def restore_backup(filepath: str, filename: str, request_user, session_data: dict = None) -> None:
        db_name = settings.DATABASES['default']['NAME']
        db_user = settings.DATABASES['default']['USER']
        db_password = settings.DATABASES['default']['PASSWORD']
        db_host = settings.DATABASES['default']['HOST']
        db_port = settings.DATABASES['default']['PORT']

        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        # Determine optimal number of parallel jobs for restore
        jobs = max(1, (os.cpu_count() or 2) - 1)

        cmd = [
            'pg_restore',
            '-h', db_host,
            '-p', str(db_port),
            '-U', db_user,
            '-d', db_name,
            '-j', str(jobs),
            '--clean',
            '--no-owner',
            filepath
        ]

        # Capture the restorer's active session data before restoration
        current_session_data = None
        try:
            if session_data and session_data.get('token_hash'):
                token_hash = session_data['token_hash']
                user_id = session_data.get('user_id', request_user.id if request_user else None)
                if user_id:
                    current_session = UserSession.objects.get(user_id=user_id, token_hash=token_hash)
                    current_session_data = {
                        'user_id': current_session.user_id,
                        'username': request_user.username if request_user else '',
                        'role': request_user.role if request_user else '',
                        'token_hash': current_session.token_hash,
                        'ip_address': current_session.ip_address,
                        'device': current_session.device
                    }
        except Exception:
            pass

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f"pg_restore failed: {e.stderr or e}")

        # Apply database migrations to ensure restored database schema matches current codebase models
        try:
            from django.core.management import call_command
            call_command('migrate', noinput=True)
        except Exception:
            pass

        # Evict all restored sessions to prevent unauthorized reuse of restored sessions
        try:
            from django.contrib.sessions.models import Session
            Session.objects.all().delete()
            UserSession.objects.all().delete()
        except Exception:
            pass

        # Restore the restorer's session so they stay logged in
        if current_session_data:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                restored_user = User.objects.filter(
                    id=current_session_data['user_id'],
                    username=current_session_data['username'],
                    role=current_session_data['role']
                ).first()
                if restored_user:
                    UserSession.objects.create(
                        user_id=restored_user.id,
                        token_hash=current_session_data['token_hash'],
                        ip_address=current_session_data['ip_address'],
                        device=current_session_data['device']
                    )
            except Exception:
                pass

        # Offload the slow Meilisearch index synchronization to Celery
        rebuild_search_index_task.delay(filename)

    @staticmethod
    def delete_backup(filepath: str) -> None:
        if os.path.exists(filepath):
            os.remove(filepath)

    @staticmethod
    def validate_filepath(filename: str) -> str:
        backup_dir = BackupService.get_backup_dir()
        # Securely validate the filepath by using os.path.realpath and os.path.commonpath
        filepath = os.path.realpath(os.path.join(backup_dir, filename))
        real_backup_dir = os.path.realpath(backup_dir)

        if os.path.commonpath([filepath, real_backup_dir]) != real_backup_dir:
            raise ValueError('Invalid filepath')

        return filepath
