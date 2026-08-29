from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="estudiante", nullable=False)  # 'admin' | 'estudiante'
    secret_question = Column(String, nullable=True)
    secret_answer = Column(String, nullable=True)
    plan_type = Column(String, default="free", nullable=False)
    credits = Column(Integer, default=0, nullable=False)

    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    match_sessions = relationship("MatchSession", back_populates="creator", cascade="all, delete-orphan")
    match_participants = relationship("MatchParticipant", back_populates="user", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_free = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notes")
    blocks = relationship("Block", back_populates="note", cascade="all, delete-orphan")
    match_sessions = relationship("MatchSession", back_populates="note", cascade="all, delete-orphan")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    level = Column(Integer, nullable=False, default=1)
    is_completed = Column(Boolean, default=False)

    note = relationship("Note", back_populates="blocks")
    questions = relationship("Question", back_populates="block", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="block", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False)
    type = Column(String, nullable=False, default="multiple_choice")
    prompt = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)  # JSON string e.g. ["Opción A", "Opción B"]
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)

    block = relationship("Block", back_populates="questions")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False)
    score = Column(Float, nullable=False, default=0.0)
    is_passed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="attempts")
    block = relationship("Block", back_populates="attempts")


class MatchSession(Base):
    """Representa un duelo/desafío creado por un usuario para un tema específico."""
    __tablename__ = "match_sessions"

    id = Column(Integer, primary_key=True, index=True)
    share_code = Column(String(8), unique=True, index=True, nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    creator_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="match_sessions")
    note = relationship("Note", back_populates="match_sessions")
    participants = relationship("MatchParticipant", back_populates="match", cascade="all, delete-orphan")


class MatchParticipant(Base):
    """Resultado de un participante dentro de un duelo."""
    __tablename__ = "match_participants"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("match_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    guest_name = Column(String, nullable=True)
    score_total = Column(Float, nullable=False, default=0.0)
    time_spent_seconds = Column(Integer, nullable=False, default=0)
    accuracy_percentage = Column(Float, nullable=False, default=0.0)
    completed_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("MatchSession", back_populates="participants")
    user = relationship("User", back_populates="match_participants")
