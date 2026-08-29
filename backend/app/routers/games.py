from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import json

from app.database import get_db
from app import models, schemas, security
from app.services.ai_service import generate_hint

router = APIRouter(prefix="/api/games", tags=["games"])


@router.post("/question-hint", response_model=schemas.HintResponse)
def get_question_hint(
    hint_req: schemas.HintRequest,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera una pista socrática de máximo 15 palabras para una pregunta específica.
    """
    try:
        # Si se provee question_id, verificar que existe
        if hint_req.question_id:
            question = db.query(models.Question).filter(models.Question.id == hint_req.question_id).first()
            if question:
                prompt = question.prompt
                q_type = question.type
                correct = question.correct_answer
            else:
                prompt = hint_req.prompt
                q_type = hint_req.question_type
                correct = hint_req.correct_answer
        else:
            prompt = hint_req.prompt
            q_type = hint_req.question_type
            correct = hint_req.correct_answer

        hint_text = generate_hint(prompt, q_type, correct)
        return schemas.HintResponse(hint=hint_text)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de pistas IA no está disponible en este momento. Intenta de nuevo."
        )


@router.get("/{note_id}/leaderboard", response_model=schemas.LeaderboardOut)
def get_note_leaderboard(
    note_id: int,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna el Top 10 de mejores puntajes históricos para un tema específico
    basándose en los MatchParticipants de todas las sesiones de ese tema.
    """
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Tema no encontrado")

    # Obtener todos los match_sessions de este note
    match_ids = db.query(models.MatchSession.id).filter(
        models.MatchSession.note_id == note_id
    ).subquery()

    # Top 10 participantes ordenados por score DESC, luego tiempo ASC
    participants = (
        db.query(models.MatchParticipant)
        .filter(models.MatchParticipant.match_id.in_(match_ids))
        .order_by(
            models.MatchParticipant.score_total.desc(),
            models.MatchParticipant.time_spent_seconds.asc()
        )
        .limit(10)
        .all()
    )

    entries = []
    for rank, p in enumerate(participants, start=1):
        if p.user_id:
            user = db.query(models.User).filter(models.User.id == p.user_id).first()
            player_name = user.email.split("@")[0] if user else "Jugador"
        else:
            player_name = p.guest_name or "Invitado"

        entries.append(schemas.LeaderboardEntry(
            rank=rank,
            player_name=player_name,
            score=p.score_total,
            time_spent_seconds=p.time_spent_seconds,
            accuracy_percentage=p.accuracy_percentage,
            completed_at=p.completed_at
        ))

    return schemas.LeaderboardOut(
        note_id=note_id,
        note_title=note.title,
        entries=entries
    )
