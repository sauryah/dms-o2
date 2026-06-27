import os
import subprocess
import hashlib
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

        BackupService.prune_old_backups()
        return filename

    @staticmethod
    def restore_backup(filepath: str, filename: str, request_user, request_meta: dict) -> None:
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
            header = request_meta.get('HTTP_AUTHORIZATION')
            if header and header.startswith('Bearer '):
                token_str = header.split(' ')[1]
                token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()
                current_session = UserSession.objects.get(user=request_user, token_hash=token_hash)
                current_session_data = {
                    'user_id': current_session.user_id,
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
                UserSession.objects.create(
                    user_id=current_session_data['user_id'],
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
