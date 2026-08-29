from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, notes, admin

from sqlalchemy import inspect, text

def run_migrations():
    try:
        with engine.connect() as conn:
            inspector = inspect(conn)
            columns = [c['name'] for c in inspector.get_columns('users')]
            
            if 'secret_question' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN secret_question VARCHAR;"))
                print("[MIGRATION] Column secret_question added to users table.")
                
            if 'secret_answer' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN secret_answer VARCHAR;"))
                print("[MIGRATION] Column secret_answer added to users table.")
                
            if 'plan_type' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN plan_type VARCHAR DEFAULT 'free';"))
                print("[MIGRATION] Column plan_type added to users table.")

            if 'credits' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;"))
                print("[MIGRATION] Column credits added to users table.")

            # Check notes table for is_free column
            note_columns = [c['name'] for c in inspector.get_columns('notes')]
            if 'is_free' not in note_columns:
                conn.execute(text("ALTER TABLE notes ADD COLUMN is_free BOOLEAN DEFAULT 0;"))
                print("[MIGRATION] Column is_free added to notes table.")

            conn.commit()
    except Exception as e:
        print(f"[MIGRATION ERROR] {e}")

run_migrations()
Base.metadata.create_all(bind=engine)

try:
    from seed_admin import seed_database
    seed_database()
except Exception as e:
    print(f"[AUTO-SEED ERROR] {e}")

app = FastAPI(
    title="Aprende Jugando API",
    description="Backend educativo gamificado con FastAPI y SQLAlchemy",
    version="1.0.0"
)

# Configuración de CORS para permitir frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Routers
app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "Aprende Jugando API",
        "docs": "/docs"
    }
