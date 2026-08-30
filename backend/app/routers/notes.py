from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.orm import Session
from typing import List
import json
import io
import pypdf
import docx

from app.database import get_db
from app import models, schemas, security
from app.services.ai_service import generate_study_game, evaluate_open_answer, evaluate_batch_open_answers

router = APIRouter(prefix="/api", tags=["notes"])

DEMO_TITLES = ["Segunda Guerra Mundial", "Sistema Digestivo", "Teorema de Tales"]

def _ensure_demo_notes(db: Session):
    for title in DEMO_TITLES:
        existing = db.query(models.Note).filter(models.Note.title == title).first()
        if not existing:
            admin_user = db.query(models.User).filter(models.User.role == "admin").first()
            user_id = admin_user.id if admin_user else 1

            demo_note = models.Note(
                user_id=user_id,
                title=title,
                content=f"Juego de estudio demo gratuito sobre {title}. Aprende los conceptos fundamentales y pon a prueba tu conocimiento.",
                is_free=True
            )
            db.add(demo_note)
            db.commit()
            db.refresh(demo_note)

            for lvl in range(1, 6):
                b = models.Block(note_id=demo_note.id, level=lvl, is_completed=False)
                db.add(b)
                db.commit()
                db.refresh(b)

                q1 = models.Question(
                    block_id=b.id,
                    type="multiple_choice",
                    prompt=f"[{title} - Nivel {lvl}] ¿Cuál es el concepto clave principal?",
                    options_json=json.dumps(["Concepto Fundamental", "Distractor A", "Distractor B", "Distractor C"]),
                    correct_answer="Concepto Fundamental",
                    explanation="Explicación didáctica del concepto clave."
                )
                q2 = models.Question(
                    block_id=b.id,
                    type="cloze",
                    prompt=f"En el tema de {title}, la clave principal es ___.",
                    options_json=json.dumps([]),
                    correct_answer="fundamental",
                    explanation="Palabra clave esperada para completar la oración."
                )
                q3 = models.Question(
                    block_id=b.id,
                    type="open_ended",
                    prompt=f"Explica brevemente la importancia de {title} en su disciplina.",
                    options_json=json.dumps([]),
                    correct_answer="Es un pilar fundamental para comprender los procesos y aplicaciones prácticas.",
                    explanation="Rúbrica conceptual esperada."
                )
                q4 = models.Question(
                    block_id=b.id,
                    type="examples",
                    prompt=f"Proporciona un ejemplo práctico sobre la aplicación de {title}.",
                    options_json=json.dumps([]),
                    correct_answer="Un caso de estudio real o ejemplo práctico ilustrativo.",
                    explanation="Ejemplo de aplicación en el mundo real."
                )
                q5 = models.Question(
                    block_id=b.id,
                    type="trick_question",
                    prompt=f"¿Es un error común pensar que {title} no tiene relevancia actual?",
                    options_json=json.dumps([]),
                    correct_answer="Sí, es un malentendido común pero su impacto sigue siendo vigente.",
                    explanation="Aclaración del malentendido habitual."
                )
                db.add_all([q1, q2, q3, q4, q5])
                db.commit()
        else:
            if not existing.is_free:
                existing.is_free = True
                db.commit()


@router.get("/notes", response_model=List[schemas.NoteOut])
def get_user_notes(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    _ensure_demo_notes(db)

    free_notes = db.query(models.Note).filter(models.Note.is_free == True).all()

    if current_user.role == "admin":
        notes = db.query(models.Note).all()
    else:
        user_notes = db.query(models.Note).filter(models.Note.user_id == current_user.id).all()
        notes_dict = {n.id: n for n in (free_notes + user_notes)}
        notes = list(notes_dict.values())
    
    for note in notes:
        _process_blocks_unlocked(note.blocks)
    return notes


@router.post("/notes/extract-file")
async def extract_text_from_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(security.get_current_user)
):
    filename = file.filename.lower() if file.filename else ""
    contents = await file.read()
    
    extracted_text = ""
    
    try:
        if filename.endswith(".pdf"):
            reader = pypdf.PdfReader(io.BytesIO(contents))
            pages_text = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            extracted_text = "\n\n".join(pages_text)
            
        elif filename.endswith(".docx"):
            doc = docx.Document(io.BytesIO(contents))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            extracted_text = "\n\n".join(paragraphs)
            
        elif filename.endswith(".txt"):
            try:
                extracted_text = contents.decode("utf-8")
            except UnicodeDecodeError:
                extracted_text = contents.decode("latin-1")
                
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato no soportado. Por favor sube un archivo .pdf, .docx o .txt"
            )
            
        if not extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo extraer texto del archivo o el documento está vacío."
            )
            
        return {"extracted_text": extracted_text}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al extraer texto del archivo: {str(e)}"
        )


@router.post("/notes/generate", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
def generate_note_with_ai(
    note_in: schemas.NoteCreate,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    # Free plan restriction check
    if current_user.role != "admin" and current_user.plan_type == "free" and current_user.credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sube a un plan premium para generar tus propios juegos."
        )

    try:
        ai_result = generate_study_game(note_in.title, note_in.content)

        new_note = models.Note(
            user_id=current_user.id,
            title=ai_result.title or note_in.title,
            content=note_in.content,
            is_free=note_in.is_free if note_in.is_free is not None else False
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)

        for b_schema in ai_result.blocks:
            block = models.Block(
                note_id=new_note.id,
                level=b_schema.level,
                is_completed=False
            )
            db.add(block)
            db.commit()
            db.refresh(block)

            for q_schema in b_schema.questions:
                question = models.Question(
                    block_id=block.id,
                    type=q_schema.type,
                    prompt=q_schema.prompt,
                    options_json=json.dumps(q_schema.options if q_schema.options else []),
                    correct_answer=q_schema.correct_answer,
                    explanation=q_schema.explanation
                )
                db.add(question)

            db.commit()

        if current_user.role != "admin" and current_user.credits > 0:
            current_user.credits -= 1
            db.commit()

        db.refresh(new_note)
        _process_blocks_unlocked(new_note.blocks)
        return new_note

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        err_text = str(e)
        if "RetryError" in err_text or "UNAVAILABLE" in err_text or "503" in err_text or "429" in err_text:
            err_text = "Los servidores de IA están con alta demanda en este momento. Por favor intenta nuevamente en unos instantes."
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al generar juego de estudio con IA: {err_text}"
        )



@router.get("/notes/{note_id}/blocks", response_model=List[schemas.BlockOut])
def get_note_blocks(
    note_id: int,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    
    blocks = db.query(models.Block).filter(models.Block.note_id == note_id).order_by(models.Block.level).all()
    _process_blocks_unlocked(blocks)
    return blocks


@router.post("/quiz/submit", response_model=schemas.AttemptOut)
def submit_quiz(
    quiz_in: schemas.QuizSubmit,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        block = db.query(models.Block).filter(models.Block.id == quiz_in.block_id).first()
        if not block:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")

        questions = db.query(models.Question).filter(models.Question.block_id == block.id).all()
        if not questions:
            raise HTTPException(status_code=400, detail="El bloque no contiene preguntas")

        questions_dict = {q.id: q for q in questions}
        details_map = {}
        open_items_to_evaluate = []
        total_score = 0.0

        for answer in quiz_in.answers:
            q = questions_dict.get(answer.question_id)
            if not q:
                continue

            user_text = answer.selected_option.strip()

            if q.type == "multiple_choice":
                is_match = user_text.lower() == q.correct_answer.strip().lower()
                q_score = 100.0 if is_match else 0.0
                feedback = "¡Respuesta Correcta!" if is_match else "Respuesta incorrecta. Revisa los conceptos del nivel e inténtalo de nuevo."
                
                details_map[q.id] = schemas.QuestionEvaluationDetail(
                    question_id=q.id,
                    type=q.type,
                    prompt=q.prompt,
                    user_answer=user_text,
                    expected_answer=q.correct_answer,
                    is_correct=is_match,
                    score=q_score,
                    feedback=feedback
                )
                total_score += q_score
            elif q.type == "cloze":
                exp_clean = q.correct_answer.strip().lower()
                usr_clean = user_text.strip().lower()
                is_match = (usr_clean == exp_clean) or (len(usr_clean) > 2 and usr_clean in exp_clean) or (len(exp_clean) > 2 and exp_clean in usr_clean)
                q_score = 100.0 if is_match else 0.0
                feedback = "¡Completado correctamente!" if is_match else f"No coincide exactamente. La palabra clave esperada era similar a '{q.correct_answer}'."
                
                details_map[q.id] = schemas.QuestionEvaluationDetail(
                    question_id=q.id,
                    type=q.type,
                    prompt=q.prompt,
                    user_answer=user_text,
                    expected_answer=q.correct_answer,
                    is_correct=is_match,
                    score=q_score,
                    feedback=feedback
                )
                total_score += q_score
            else:
                open_items_to_evaluate.append({
                    "question_id": q.id,
                    "prompt": q.prompt,
                    "expected_answer": q.correct_answer,
                    "user_answer": user_text
                })

        # Evaluación en 1 sola llamada API para todas las preguntas abiertas del cuestionario
        if open_items_to_evaluate:
            eval_results = evaluate_batch_open_answers(open_items_to_evaluate)
            eval_map = {item.question_id: item for item in eval_results}

            for item in open_items_to_evaluate:
                q_id = item["question_id"]
                q = questions_dict[q_id]
                res = eval_map.get(q_id)

                if res:
                    is_corr = res.is_correct
                    score_val = res.score
                    fb_val = res.feedback
                else:
                    exp_c = q.correct_answer.strip().lower()
                    usr_c = item["user_answer"].strip().lower()
                    is_corr = exp_c in usr_c or usr_c in exp_c if usr_c else False
                    score_val = 100.0 if is_corr else 0.0
                    fb_val = "Respuesta evaluada por síntesis conceptual."

                details_map[q_id] = schemas.QuestionEvaluationDetail(
                    question_id=q.id,
                    type=q.type,
                    prompt=q.prompt,
                    user_answer=item["user_answer"],
                    expected_answer=q.correct_answer,
                    is_correct=is_corr,
                    score=score_val,
                    feedback=fb_val
                )
                total_score += score_val

        # Ordenar los detalles manteniendo la secuencia original de preguntas
        details = [details_map[q.id] for q in questions if q.id in details_map]

        final_score = round(total_score / len(questions), 2)
        is_passed = final_score >= 60.0

        if is_passed:
            block.is_completed = True
            db.commit()

        attempt = models.Attempt(
            user_id=current_user.id,
            block_id=block.id,
            score=final_score,
            is_passed=is_passed
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        return schemas.AttemptOut(
            id=attempt.id,
            user_id=attempt.user_id,
            block_id=attempt.block_id,
            score=attempt.score,
            is_passed=attempt.is_passed,
            created_at=attempt.created_at,
            details=details
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Los servidores de IA están muy concurridos. No te preocupes, tu progreso está a salvo. Por favor, cierra este cartel y presiona evaluar nuevamente."
        )


@router.get("/attempts", response_model=List[schemas.AttemptOut])
def get_user_attempts(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    attempts = db.query(models.Attempt).filter(models.Attempt.user_id == current_user.id).all()
    return [
        schemas.AttemptOut(
            id=a.id,
            user_id=a.user_id,
            block_id=a.block_id,
            score=a.score,
            is_passed=a.is_passed,
            created_at=a.created_at,
            details=[]
        ) for a in attempts
    ]


def _process_blocks_unlocked(blocks):
    sorted_blocks = sorted(blocks, key=lambda b: b.level)
    for idx, b in enumerate(sorted_blocks):
        if idx == 0:
            b.is_unlocked = True
        else:
            prev_block = sorted_blocks[idx - 1]
            b.is_unlocked = prev_block.is_completed
