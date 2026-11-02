"""Backup and restore router"""
import os
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


@router.post("/create")
def create_backup(current_user: User = Depends(get_current_user)):
    """Create a safe WAL-checkpointed database backup."""
    if current_user.role.value not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    data_dir = Path(os.environ.get("SMARTBIZ_DATA_DIR", Path.home() / "AppData" / "Roaming" / "SmartBizAI"))
    db_path = data_dir / "smartbiz.db"
    backup_dir = data_dir / "backups"
    backup_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"smartbiz_backup_{timestamp}.db"

    # Use SQLite's online backup API via Python sqlite3
    import sqlite3
    src = sqlite3.connect(str(db_path))
    dst = sqlite3.connect(str(backup_path))
    with dst:
        src.backup(dst)
    dst.close()
    src.close()

    return {"success": True, "backup_path": str(backup_path), "filename": backup_path.name}


@router.get("/list")
def list_backups(current_user: User = Depends(get_current_user)):
    data_dir = Path(os.environ.get("SMARTBIZ_DATA_DIR", Path.home() / "AppData" / "Roaming" / "SmartBizAI"))
    backup_dir = data_dir / "backups"
    if not backup_dir.exists():
        return []
    files = sorted(backup_dir.glob("*.db"), reverse=True)
    return [
        {"filename": f.name, "size_mb": round(f.stat().st_size / 1024 / 1024, 2), "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat()}
        for f in files[:20]
    ]
