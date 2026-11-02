"""Settings router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from routers.auth import get_current_user
from models.user_models import User
from database import get_db

router = APIRouter()


@router.get("/")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"company_id": current_user.company_id, "role": current_user.role.value}
