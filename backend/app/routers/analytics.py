from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, Project, ProjectMember, Task, SystemRole, ProjectRemark
from app.schemas import ProjectAnalytics, MemberContribution

router = APIRouter(prefix="/projects/{project_id}", tags=["Teacher Analytics & Evaluation"])


class RemarkInput(BaseModel):
    grade_or_score: str
    general_feedback: str

@router.get("/analytics/", response_model=ProjectAnalytics)
def get_project_analytics(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculates progress percentage, task status distributions, 
    and individual member task completion counts for evaluation.
    """
    # 1. Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    # 2. Verify user is part of the project (or is a System Teacher)
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    # Check against both SystemRole enum and string representation
    user_role = getattr(current_user.role, "value", current_user.role)
    if not membership and user_role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view evaluation analytics for this project."
        )

    # 3. Calculate task totals
    all_tasks = db.query(Task).filter(Task.project_id == project_id).all()
    total_tasks = len(all_tasks)

    completed_tasks = sum(1 for t in all_tasks if t.status == "Completed")
    in_progress_tasks = sum(1 for t in all_tasks if t.status == "In Progress")
    todo_tasks = sum(1 for t in all_tasks if t.status == "Todo")
    review_tasks = sum(1 for t in all_tasks if t.status == "Review")

    completion_percentage = round((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0.0

    # 4. Aggregate individual member contributions
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    contributions = []

    for m in members:
        user_obj = db.query(User).filter(User.id == m.user_id).first()
        if user_obj:
            assigned = [t for t in all_tasks if t.assigned_to == user_obj.id]
            comp = sum(1 for t in assigned if t.status == "Completed")
            prog = sum(1 for t in assigned if t.status == "In Progress")

            contributions.append(MemberContribution(
                user_id=user_obj.id,
                full_name=user_obj.full_name,
                email=user_obj.email,
                role=m.project_role,
                total_assigned_tasks=len(assigned),
                completed_tasks=comp,
                in_progress_tasks=prog
            ))

    return ProjectAnalytics(
        project_id=project.id,
        project_title=project.title,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        todo_tasks=todo_tasks,
        review_tasks=review_tasks,
        completion_percentage=completion_percentage,
        member_contributions=contributions
    )


@router.get("/evaluation/")
def get_project_evaluation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    remark = db.query(ProjectRemark).filter(ProjectRemark.project_id == project_id).first()
    if not remark:
        return None
    return remark


@router.post("/evaluation/")
def save_project_evaluation(
    project_id: int,
    data: RemarkInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role = getattr(current_user.role, "value", current_user.role)
    if user_role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can evaluate projects.")

    existing_remark = db.query(ProjectRemark).filter(ProjectRemark.project_id == project_id).first()
    if existing_remark:
        existing_remark.grade_or_score = data.grade_or_score
        existing_remark.general_feedback = data.general_feedback
        db.commit()
        db.refresh(existing_remark)
        return existing_remark

    new_remark = ProjectRemark(
        project_id=project_id,
        teacher_id=current_user.id,
        grade_or_score=data.grade_or_score,
        general_feedback=data.general_feedback
    )
    db.add(new_remark)
    db.commit()
    db.refresh(new_remark)
    return new_remark