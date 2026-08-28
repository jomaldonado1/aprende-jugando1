from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app import models, schemas, security

from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=List[schemas.AdminUserDetail])
def get_all_users_detail(
    admin_user: models.User = Depends(security.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).all()
    result = []
    for u in users:
        notes_count = len(u.notes) if u.notes else 0
        attempts_count = len(u.attempts) if u.attempts else 0
        result.append(schemas.AdminUserDetail(
            id=u.id,
            email=u.email,
            role=u.role,
            notes_count=notes_count,
            attempts_count=attempts_count
        ))
    return result


@router.get("/notes", response_model=List[schemas.AdminNoteDetail])
def get_all_notes_detail(
    admin_user: models.User = Depends(security.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    notes = db.query(models.Note).order_by(models.Note.id.desc()).all()
    result = []
    for n in notes:
        origin = "Tema Libre (IA)" if "Genera un juego de estudio exhaustivo" in n.content else "Apunte / Archivo"
        user_email = n.user.email if n.user else "Desconocido"
        snippet = n.content[:80] + "..." if len(n.content) > 80 else n.content
        result.append(schemas.AdminNoteDetail(
            id=n.id,
            user_id=n.user_id,
            user_email=user_email,
            title=n.title,
            content_snippet=snippet,
            created_at=n.created_at or datetime.utcnow(),
            origin_type=origin,
            is_free=n.is_free,
            blocks_count=len(n.blocks) if n.blocks else 0
        ))
    return result


@router.put("/notes/{note_id}/toggle-free", response_model=schemas.AdminNoteDetail)
def toggle_note_free_status(
    note_id: int,
    admin_user: models.User = Depends(security.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Juego/Apunte no encontrado.")
    
    note.is_free = not note.is_free
    db.commit()
    db.refresh(note)

    origin = "Tema Libre (IA)" if "Genera un juego de estudio exhaustivo" in note.content else "Apunte / Archivo"
    user_email = note.user.email if note.user else "Desconocido"
    snippet = note.content[:80] + "..." if len(note.content) > 80 else note.content
    return schemas.AdminNoteDetail(
        id=note.id,
        user_id=note.user_id,
        user_email=user_email,
        title=note.title,
        content_snippet=snippet,
        created_at=note.created_at or datetime.utcnow(),
        origin_type=origin,
        is_free=note.is_free,
        blocks_count=len(note.blocks) if note.blocks else 0
    )


@router.get("/attempts", response_model=List[schemas.AdminAttemptDetail])
def get_all_attempts_detail(
    admin_user: models.User = Depends(security.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    attempts = db.query(models.Attempt).order_by(models.Attempt.id.desc()).all()
    result = []
    for a in attempts:
        user_email = a.user.email if a.user else "Desconocido"
        note_title = a.block.note.title if a.block and a.block.note else "Apunte Generado"
        level = a.block.level if a.block else 1
        result.append(schemas.AdminAttemptDetail(
            id=a.id,
            user_id=a.user_id,
            user_email=user_email,
            note_title=note_title,
            level=level,
            score=a.score,
            is_passed=a.is_passed,
            created_at=a.created_at or datetime.utcnow()
        ))
    return result


@router.get("/stats")
def get_admin_stats(
    admin_user: models.User = Depends(security.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    total_users = db.query(models.User).count()
    total_students = db.query(models.User).filter(models.User.role == "estudiante").count()
    total_admins = db.query(models.User).filter(models.User.role == "admin").count()
    total_notes = db.query(models.Note).count()
    total_blocks = db.query(models.Block).count()
    total_questions = db.query(models.Question).count()
    total_attempts = db.query(models.Attempt).count()
    passed_attempts = db.query(models.Attempt).filter(models.Attempt.is_passed == True).count()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_admins": total_admins,
        "total_notes": total_notes,
        "total_blocks": total_blocks,
        "total_questions": total_questions,
        "total_attempts": total_attempts,
        "passed_attempts": passed_attempts,
    }


@router.get("/questions", response_model=List[schemas.QuestionOut])
def get_all_questions(
    q: Optional[str] = Query(None, description="Término de búsqueda en la pregunta o respuesta"),
    type: Optional[str] = Query(None, description="Filtrar por tipo de pregunta"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin_user: models.User = Depends(security.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Question)
    if q:
        search_pattern = f"%{q}%"
        query = query.filter(
            (models.Question.prompt.ilike(search_pattern)) | 
            (models.Question.correct_answer.ilike(search_pattern))
        )
    if type:
        query = query.filter(models.Question.type == type)

    return query.order_by(models.Question.id.desc()).offset(offset).limit(limit).all()


@router.put("/questions/{question_id}", response_model=schemas.QuestionOut)
def update_question(
    question_id: int,
    q_update: schemas.QuestionUpdate,
    admin_user: models.User = Depends(security.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    if q_update.prompt is not None:
        question.prompt = q_update.prompt
    if q_update.options_json is not None:
        question.options_json = q_update.options_json
    if q_update.correct_answer is not None:
        question.correct_answer = q_update.correct_answer
    if q_update.explanation is not None:
        question.explanation = q_update.explanation

    db.commit()
    db.refresh(question)
    return question
