from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este correo ya está registrado."
        )
    
    hashed_pwd = security.get_password_hash(user_in.password)
    secret_q = user_in.secret_question.strip() if user_in.secret_question else None
    secret_a = user_in.secret_answer.strip().lower() if user_in.secret_answer else None

    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        role="estudiante",
        secret_question=secret_q,
        secret_answer=secret_a
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/security-question/{email}")
def get_security_question(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email.strip().lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe una cuenta registrada con este correo."
        )
    
    if not user.secret_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta fue creada antes de las preguntas de seguridad. Contacta al administrador."
        )
    
    return {
        "email": user.email,
        "secret_question": user.secret_question
    }


@router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.strip().lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe una cuenta registrada con este correo."
        )
    
    if not user.secret_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta fue creada antes de las preguntas de seguridad. Contacta al administrador."
        )
    
    given_ans = req.secret_answer.strip().lower()
    stored_ans = user.secret_answer.strip().lower()

    if given_ans != stored_ans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La respuesta secreta es incorrecta."
        )
    
    user.hashed_password = security.get_password_hash(req.new_password)
    db.commit()
    return {"detail": "Contraseña actualizada exitosamente."}

@router.post("/login", response_model=schemas.Token)
def login_user(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not security.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.UserOut)
def get_current_user_profile(current_user: models.User = Depends(security.get_current_user)):
    return current_user
