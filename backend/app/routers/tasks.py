from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, Task, ProjectMember, ActivityLog
from app.schemas import TaskCreate, TaskUpdateStatus, TaskOut, ActivityLogOut

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["Task Management"])

def verify_project_membership(project_id: int, user_id: int, db: Session) -> ProjectMember:
    """Helper function to confirm a user belongs to a project before accessing tasks."""
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project."
        )
    return membership

@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a task within a project and logs the event."""
    verify_project_membership(project_id, current_user.id, db)

    # Check if assigned user is in the project (if specified)
    if task_in.assigned_to:
        assigned_membership = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == task_in.assigned_to
        ).first()
        if not assigned_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user is not a member of this project."
            )

    new_task = Task(
        project_id=project_id,
        assigned_to=task_in.assigned_to,
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        deadline=task_in.deadline
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Automated Activity Audit Log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=f"Created task: '{new_task.title}'"
    )
    db.add(log)
    db.commit()

    return new_task

@router.get("/", response_model=List[TaskOut])
def list_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all tasks for a specific project."""
    verify_project_membership(project_id, current_user.id, db)
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks

@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    project_id: int,
    task_id: int,
    status_in: TaskUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates task status (Todo, In Progress, Review, Completed) and logs audit trail."""
    verify_project_membership(project_id, current_user.id, db)

    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    old_status = task.status
    task.status = status_in.status
    db.commit()
    db.refresh(task)

    # Automated Activity Audit Log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=f"Updated task '{task.title}' status from '{old_status}' to '{task.status}'"
    )
    db.add(log)
    db.commit()

    return task

@router.get("/activity-log", response_model=List[ActivityLogOut])
def get_activity_log(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches the project activity audit trail ordered by most recent."""
    verify_project_membership(project_id, current_user.id, db)
    logs = db.query(ActivityLog).filter(
        ActivityLog.project_id == project_id
    ).order_by(ActivityLog.timestamp.desc()).all()
    return logs