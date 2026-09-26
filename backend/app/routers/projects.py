from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, Project, ProjectMember, ProjectRole, ActivityLog, Task, DiscussionMessage, ProjectRemark
from app.schemas import ProjectCreate, ProjectOut, MemberAdd, MemberOut

router = APIRouter(prefix="/projects", tags=["Project Management"])

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new project and sets owner_id safely."""
    try:
        new_project = Project(
            title=project_in.title,
            description=project_in.description,
            course=project_in.course,
            semester=project_in.semester,
            deadline=project_in.deadline,
            owner_id=current_user.id
        )
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        # Create membership
        owner_membership = ProjectMember(
            user_id=current_user.id,
            project_id=new_project.id,
            project_role=ProjectRole.OWNER
        )
        db.add(owner_membership)

        # Log creation
        log = ActivityLog(
            project_id=new_project.id,
            user_id=current_user.id,
            action=f"Created project '{new_project.title}'"
        )
        db.add(log)
        db.commit()

        return new_project
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database Creation Error: {str(e)}"
        )

@router.get("/", response_model=List[ProjectOut])
def list_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches all projects that the logged-in user belongs to or owns."""
    memberships = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    project_ids = [m.project_id for m in memberships]
    
    projects = db.query(Project).filter(
        (Project.id.in_(project_ids)) | (Project.owner_id == current_user.id)
    ).all()
    return projects

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Project Owner can edit project details."
        )

    project.title = project_in.title
    project.description = project_in.description
    project.course = project_in.course
    project.semester = project_in.semester
    project.deadline = project_in.deadline

    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=f"Updated project details for '{project.title}'"
    )
    db.add(log)
    db.commit()
    db.refresh(project)

    return project

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Project Owner can delete this project."
        )

    db.query(Task).filter(Task.project_id == project_id).delete()
    db.query(ActivityLog).filter(ActivityLog.project_id == project_id).delete()
    db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
    db.query(DiscussionMessage).filter(DiscussionMessage.project_id == project_id).delete()
    db.query(ProjectRemark).filter(ProjectRemark.project_id == project_id).delete()

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully."}

@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
def add_team_member(
    project_id: int,
    member_in: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    if project.owner_id != current_user.id:
        requester = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.project_role == ProjectRole.OWNER
        ).first()
        if not requester:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Project Owner can add team members."
            )

    target_user = db.query(User).filter(User.email == member_in.email).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with this email not found.")

    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == target_user.id
    ).first()
    if existing_member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a project member.")

    role_enum = ProjectRole.MENTOR if member_in.role in ["mentor", "teacher"] else ProjectRole.MEMBER
    new_member = ProjectMember(
        user_id=target_user.id,
        project_id=project_id,
        project_role=role_enum
    )
    db.add(new_member)

    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=f"Added {target_user.full_name} ({member_in.role}) to the project"
    )
    db.add(log)
    db.commit()

    return {"message": f"Successfully added {target_user.full_name} to the project."}

@router.get("/{project_id}/members", response_model=List[MemberOut])
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not membership and project.owner_id != current_user.id and getattr(current_user, "role", "") != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    
    result = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            result.append(MemberOut(
                id=m.id,
                user_id=u.id,
                project_id=m.project_id,
                project_role=str(m.project_role.value if hasattr(m.project_role, "value") else m.project_role),
                full_name=u.full_name,
                email=u.email
            ))
    return result