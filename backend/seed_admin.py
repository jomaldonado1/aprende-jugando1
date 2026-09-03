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

        # 3. Crear Apunte Demo de estudio gamificado SOLO si la base de datos está completamente vacía
        total_existing_notes = db.query(Note).count()
        if total_existing_notes == 0:
            note = Note(
                user_id=student.id if student else admin.id,
                title="Fundamentos de Programación",
                content="""# Fundamentos de Programación
Python es un lenguaje de programación de alto nivel, interpretado y dinámico.
Conceptos Clave:
- Funciones: Se definen con la palabra clave `def`.
- Estructuras de Datos: Las listas son mutables (se pueden modificar), mientras que las tuplas son inmutables.
- Salida estándar: Se utiliza `print()` para mostrar resultados en la terminal."""
            )
            db.add(note)
            db.commit()
            db.refresh(note)

            # Nivel 1
            block1 = Block(note_id=note.id, level=1, is_completed=False)
            db.add(block1)
            db.commit()
            db.refresh(block1)

            q1 = Question(
                block_id=block1.id,
                type="multiple_choice",
                prompt="¿Qué palabra clave se utiliza para definir una función en Python?",
                options_json=json.dumps(["def", "function", "fn", "create"]),
                correct_answer="def",
                explanation="En Python, la palabra reservada 'def' inicia la declaración de una función."
            )
            q2 = Question(
                block_id=block1.id,
                type="multiple_choice",
                prompt="¿Cuál de las siguientes colecciones de datos es MUTABLE en Python?",
                options_json=json.dumps(["Lista [ ]", "Tupla ( )", "Cadena de texto", "Entero"]),
                correct_answer="Lista [ ]",
                explanation="Las listas son mutables; se pueden agregar, remover o modificar sus elementos."
            )
            q3 = Question(
                block_id=block1.id,
                type="multiple_choice",
                prompt="¿Qué función integrada imprime un mensaje en la consola de comandos?",
                options_json=json.dumps(["print()", "echo()", "console.log()", "system.out()"]),
                correct_answer="print()",
                explanation="'print()' es la función estándar de salida en Python."
            )

            # Nivel 2
            block2 = Block(note_id=note.id, level=2, is_completed=False)
            db.add(block2)
            db.commit()
            db.refresh(block2)

            q4 = Question(
                block_id=block2.id,
                type="multiple_choice",
                prompt="¿Cuál es el resultado de la división entera 10 // 3 en Python?",
                options_json=json.dumps(["3", "3.333", "3.0", "1"]),
                correct_answer="3",
                explanation="El operador // realiza la división entera descartando la parte decimal."
            )

            db.add_all([q1, q2, q3, q4])
            db.commit()
            print("[SUCCESS] Apunte y bloques gamificados creados con éxito.")

        print("[COMPLETE] Siembra de datos completada satisfactoriamente.")

    except Exception as e:
        print(f"[ERROR] Error durante el seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
