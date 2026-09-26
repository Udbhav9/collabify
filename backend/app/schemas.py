from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from app.models import SystemRole

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: SystemRole = SystemRole.STUDENT

class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: SystemRole
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    course: str
    semester: int
    deadline: datetime

class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    course: str
    semester: int
    deadline: datetime
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class MemberAdd(BaseModel):
    email: EmailStr
    role: Optional[str] = "member"

class MemberOut(BaseModel):
    id: int
    user_id: int
    project_id: int
    project_role: str
    full_name: str
    email: EmailStr

    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    priority: Optional[str] = "Medium"
    deadline: Optional[datetime] = None

class TaskUpdateStatus(BaseModel):
    status: str

class TaskOut(BaseModel):
    id: int
    project_id: int
    assigned_to: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    deadline: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityLogOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    action: str
    timestamp: datetime

    class Config:
        from_attributes = True

class MemberContribution(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    total_assigned_tasks: int
    completed_tasks: int
    in_progress_tasks: int

class ProjectAnalytics(BaseModel):
    project_id: int
    project_title: str
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    todo_tasks: int
    review_tasks: int
    completion_percentage: float
    member_contributions: List[MemberContribution]