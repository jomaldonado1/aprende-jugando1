from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import random
import string
import json

from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/api/matches", tags=["matches"])


def _generate_code(db: Session, length: int = 6) -> str:
    """Genera un código alfanumérico único para el duelo."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = "".join(random.choices(chars, k=length))
        existing = db.query(models.MatchSession).filter(
            models.MatchSession.share_code == code
        ).first()
        if not existing:
            return code
    raise RuntimeError("No se pudo generar un código único para el duelo.")


def _build_match_out(match: models.MatchSession, base_url: str, db: Session) -> schemas.MatchOut:
    note = db.query(models.Note).filter(models.Note.id == match.note_id).first()
    creator = db.query(models.User).filter(models.User.id == match.creator_user_id).first()
    return schemas.MatchOut(
        id=match.id,
        share_code=match.share_code,
        note_id=match.note_id,
        note_title=note.title if note else "Tema desconocido",
        creator_email=creator.email if creator else "desconocido",
        created_at=match.created_at,
        share_link=f"{base_url}/duel/{match.share_code}"
    )


@router.post("/create", response_model=schemas.MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(
    match_in: schemas.MatchCreate,
    request: Request,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera un nuevo desafío asociado a un tema y retorna el código y link compartible.
    """
    note = db.query(models.Note).filter(models.Note.id == match_in.note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")

    share_code = _generate_code(db)

    match = models.MatchSession(
        share_code=share_code,
        note_id=match_in.note_id,
        creator_user_id=current_user.id
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    base_url = str(request.base_url).rstrip("/")
    return _build_match_out(match, base_url, db)


@router.get("/{match_code}", response_model=schemas.MatchDetailOut)
def get_match(
    match_code: str,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna el tema, las preguntas del primer bloque del duelo y la tabla de clasificación actual.
    """
    match = db.query(models.MatchSession).filter(
        models.MatchSession.share_code == match_code.upper()
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Duelo no encontrado. Verifica el código.")

    note = db.query(models.Note).filter(models.Note.id == match.note_id).first()
    creator = db.query(models.User).filter(models.User.id == match.creator_user_id).first()

    # Obtener preguntas del primer bloque del apunte
    first_block = (
        db.query(models.Block)
        .filter(models.Block.note_id == match.note_id)
        .order_by(models.Block.level)
        .first()
    )
    questions = []
    if first_block:
        questions = db.query(models.Question).filter(
            models.Question.block_id == first_block.id
        ).all()

    # Leaderboard del duelo
    participants = (
        db.query(models.MatchParticipant)
        .filter(models.MatchParticipant.match_id == match.id)
        .order_by(
            models.MatchParticipant.score_total.desc(),
            models.MatchParticipant.time_spent_seconds.asc()
        )
        .all()
    )

    leaderboard = []
    for rank, p in enumerate(participants, start=1):
        if p.user_id:
            user = db.query(models.User).filter(models.User.id == p.user_id).first()
            player_name = user.email.split("@")[0] if user else "Jugador"
        else:
            player_name = p.guest_name or "Invitado"

        leaderboard.append(schemas.MatchParticipantOut(
            id=p.id,
            player_name=player_name,
            score_total=p.score_total,
            time_spent_seconds=p.time_spent_seconds,
            accuracy_percentage=p.accuracy_percentage,
            completed_at=p.completed_at,
            rank=rank
        ))

    return schemas.MatchDetailOut(
        id=match.id,
        share_code=match.share_code,
        note_id=match.note_id,
        note_title=note.title if note else "Tema desconocido",
        creator_email=creator.email if creator else "desconocido",
        created_at=match.created_at,
        questions=[schemas.QuestionOut.model_validate(q) for q in questions],
        leaderboard=leaderboard
    )


@router.post("/{match_code}/submit", response_model=schemas.MatchParticipantOut)
def submit_match_result(
    match_code: str,
    result: schemas.MatchParticipantSubmit,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Registra los resultados del participante en el duelo y calcula su posición.
    """
    match = db.query(models.MatchSession).filter(
        models.MatchSession.share_code == match_code.upper()
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Duelo no encontrado.")

    participant = models.MatchParticipant(
        match_id=match.id,
        user_id=current_user.id,
        score_total=round(result.score_total, 2),
        time_spent_seconds=result.time_spent_seconds,
        accuracy_percentage=round(result.accuracy_percentage, 2)
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)

    # Calcular rank
    better_count = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match.id,
        models.MatchParticipant.score_total > participant.score_total
    ).count()
    rank = better_count + 1

    player_name = current_user.email.split("@")[0]

    return schemas.MatchParticipantOut(
        id=participant.id,
        player_name=player_name,
        score_total=participant.score_total,
        time_spent_seconds=participant.time_spent_seconds,
        accuracy_percentage=participant.accuracy_percentage,
        completed_at=participant.completed_at,
        rank=rank
    )
