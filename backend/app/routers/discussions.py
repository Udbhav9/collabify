from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, Project, ProjectMember, DiscussionMessage

router = APIRouter(prefix="/projects/{project_id}/discussions", tags=["Project Discussions"])


class DiscussionCreate(BaseModel):
    message: str


class DiscussionOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    sender_name: str
    role: str
    message: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[DiscussionOut])
def get_project_discussions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify user is member or teacher
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    
    if not membership and getattr(current_user, "role", "") != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized to view project discussions.")

    return db.query(DiscussionMessage).filter(DiscussionMessage.project_id == project_id).order_by(DiscussionMessage.timestamp.asc()).all()


@router.post("/", response_model=DiscussionOut)
def create_discussion_message(
    project_id: int,
    data: DiscussionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    new_msg = DiscussionMessage(
        project_id=project_id,
        user_id=current_user.id,
        sender_name=current_user.full_name,
        role=current_user.role,
        message=data.message
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg