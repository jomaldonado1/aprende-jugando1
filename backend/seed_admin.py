import os
import sys
import json

# Set stdout encoding if possible
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Asegurar que el directorio raíz del backend esté en sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import User, Note, Block, Question
from app.security import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("[SEED] Iniciando siembra de base de datos...")

        # 1. Crear / Asegurar usuario Administrador
        admin_email = "admin@test.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin)
        else:
            admin.hashed_password = get_password_hash("admin123")
            admin.role = "admin"
        db.commit()
        db.refresh(admin)
        print(f"[SUCCESS] Usuario Admin asegurado: {admin_email} / admin123")

        # 2. Crear / Asegurar usuario Estudiante de prueba
        student_email = "estudiante@test.com"
        student = db.query(User).filter(User.email == student_email).first()
        if not student:
            student = User(
                email=student_email,
                hashed_password=get_password_hash("estudiante123"),
                role="estudiante"
            )
            db.add(student)
        else:
            student.hashed_password = get_password_hash("estudiante123")
        db.commit()
        db.refresh(student)
        print(f"[SUCCESS] Usuario Estudiante asegurado: {student_email} / estudiante123")

        # 3. Asegurar Apuntes Demo de estudio gamificado como registros reales en la base de datos
        demo_games = [
            {
                "title": "Fundamentos de Programación",
                "content": "Juego de estudio demo gratuito sobre Fundamentos de Programación en Python, estructuras de datos, funciones y sintaxis.",
                "is_free": True
            },
            {
                "title": "Segunda Guerra Mundial",
                "content": "Juego de estudio demo gratuito sobre la Segunda Guerra Mundial, causas, antecedentes, desarrollo del conflicto y consecuencias globales.",
                "is_free": True
            },
            {
                "title": "Sistema Digestivo",
                "content": "Juego de estudio demo gratuito sobre el Sistema Digestivo humano, órganos, enzimas, digestión mecánica y química.",
                "is_free": True
            },
            {
                "title": "Teorema de Tales",
                "content": "Juego de estudio demo gratuito sobre el Teorema de Tales, geometría, semejanza de triángulos y proporciones.",
                "is_free": True
            }
        ]

        owner_id = student.id if student else admin.id

        for game in demo_games:
            existing = db.query(Note).filter(Note.title == game["title"]).first()
            if not existing:
                note = Note(
                    user_id=owner_id,
                    title=game["title"],
                    content=game["content"],
                    is_free=game["is_free"]
                )
                db.add(note)
                db.commit()
                db.refresh(note)

                for lvl in range(1, 6):
                    b = Block(note_id=note.id, level=lvl, is_completed=False)
                    db.add(b)
                    db.commit()
                    db.refresh(b)

                    q1 = Question(
                        block_id=b.id,
                        type="multiple_choice",
                        prompt=f"[{game['title']} - Nivel {lvl}] ¿Cuál es el concepto clave principal?",
                        options_json=json.dumps(["Concepto Fundamental", "Distractor A", "Distractor B", "Distractor C"]),
                        correct_answer="Concepto Fundamental",
                        explanation="Explicación didáctica del concepto clave."
                    )
                    q2 = Question(
                        block_id=b.id,
                        type="cloze",
                        prompt=f"En el tema de {game['title']}, la clave principal es ___.",
                        options_json=json.dumps([]),
                        correct_answer="fundamental",
                        explanation="Palabra clave esperada para completar la oración."
                    )
                    q3 = Question(
                        block_id=b.id,
                        type="open_ended",
                        prompt=f"Explica brevemente la importancia de {game['title']} en su disciplina.",
                        options_json=json.dumps([]),
                        correct_answer="Es un pilar fundamental para comprender los procesos y aplicaciones prácticas.",
                        explanation="Rúbrica conceptual esperada."
                    )
                    q4 = Question(
                        block_id=b.id,
                        type="examples",
                        prompt=f"Proporciona un ejemplo práctico sobre la aplicación de {game['title']}.",
                        options_json=json.dumps([]),
                        correct_answer="Un caso de estudio real o ejemplo práctico ilustrativo.",
                        explanation="Ejemplo de aplicación en el mundo real."
                    )
                    q5 = Question(
                        block_id=b.id,
                        type="trick_question",
                        prompt=f"¿Es un error común pensar que {game['title']} no tiene relevancia actual?",
                        options_json=json.dumps([]),
                        correct_answer="Sí, es un malentendido común pero su impacto sigue siendo vigente.",
                        explanation="Aclaración del malentendido habitual."
                    )
                    db.add_all([q1, q2, q3, q4, q5])
                    db.commit()

                print(f"[SUCCESS] Juego Demo '{game['title']}' registrado en la base de datos.")

        print("[COMPLETE] Siembra de datos completada satisfactoriamente.")

    except Exception as e:
        print(f"[ERROR] Error durante el seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
