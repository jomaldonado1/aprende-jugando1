from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "estudiante"
    secret_question: Optional[str] = None
    secret_answer: Optional[str] = None

class UserLogin(UserBase):
    password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    secret_answer: str
    new_password: str

class UserOut(UserBase):
    id: int
    role: str
    plan_type: str = "free"
    credits: int = 0

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Question Schemas
class QuestionOut(BaseModel):
    id: int
    block_id: int
    type: str
    prompt: str
    options_json: str
    correct_answer: str
    explanation: Optional[str] = None

    class Config:
        from_attributes = True

class QuestionUpdate(BaseModel):
    prompt: Optional[str] = None
    options_json: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None

# Block Schemas
class BlockOut(BaseModel):
    id: int
    note_id: int
    level: int
    is_completed: bool
    is_unlocked: bool = True
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True

# Note Schemas
class NoteCreate(BaseModel):
    title: str
    content: str
    is_free: Optional[bool] = False

class NoteOut(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    is_free: bool = False
    created_at: datetime
    blocks: List[BlockOut] = []

    class Config:
        from_attributes = True

# Quiz Submission Schemas
class AnswerSubmit(BaseModel):
    question_id: int
    selected_option: str

class QuizSubmit(BaseModel):
    block_id: int
    answers: List[AnswerSubmit]

class QuestionEvaluationDetail(BaseModel):
    question_id: int
    type: str
    prompt: str
    user_answer: str
    expected_answer: str
    is_correct: bool
    score: float
    feedback: str

class AttemptOut(BaseModel):
    id: int
    user_id: int
    block_id: int
    score: float
    is_passed: bool
    created_at: datetime
    details: List[QuestionEvaluationDetail] = []

    class Config:
        from_attributes = True

# Admin Detail Schemas
class AdminUserDetail(BaseModel):
    id: int
    email: str
    role: str
    notes_count: int = 0
    attempts_count: int = 0

class AdminNoteDetail(BaseModel):
    id: int
    user_id: int
    user_email: str
    title: str
    content_snippet: str
    created_at: datetime
    origin_type: str
    is_free: bool = False
    blocks_count: int = 0

class AdminAttemptDetail(BaseModel):
    id: int
    user_id: int
    user_email: str
    note_title: str
    level: int
    score: float
    is_passed: bool
    created_at: datetime
