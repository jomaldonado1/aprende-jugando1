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

        # 3. Asegurar Apuntes Demo de estudio gamificado con preguntas detalladas y reales
        DEMO_SPECIFIC_QUESTIONS = {
            "Segunda Guerra Mundial": [
                {
                    "type": "multiple_choice",
                    "prompt": "¿En qué año comenzó la Segunda Guerra Mundial con la invasión nazi a Polonia?",
                    "options": ["1939", "1914", "1941", "1945"],
                    "correct": "1939",
                    "explanation": "La invasión de Polonia por las tropas alemanas el 1 de septiembre de 1939 desató el conflicto en Europa."
                },
                {
                    "type": "cloze",
                    "prompt": "El pacto de no agresión firmado entre Alemania y la Unión Soviética en 1939 se conoció como el Pacto Molotov-___.",
                    "options": [],
                    "correct": "ribbentrop",
                    "explanation": "El Pacto Molotov-Ribbentrop garantizaba la no agresión mutua entre la Alemania nazi y la URSS."
                },
                {
                    "type": "open_ended",
                    "prompt": "Explica la importancia estratégica de la Batalla de Stalingrado en el desenlace de la guerra.",
                    "options": [],
                    "correct": "Fue la batalla decisiva que frenó la expansión alemana en el frente oriental y marcó el inicio del repliegue nazi.",
                    "explanation": "Stalingrado significó la pérdida irrecuperable del Sexto Ejército alemán."
                },
                {
                    "type": "examples",
                    "prompt": "Menciona un desarrollo tecnológico clave que surgió o se perfeccionó durante la Segunda Guerra Mundial.",
                    "options": [],
                    "correct": "El radar para detección aérea, los motores a reacción o la energía atómica.",
                    "explanation": "La urgencia bélica aceleró avances científicos sin precedentes."
                },
                {
                    "type": "trick_question",
                    "prompt": "¿Es correcto afirmar que Estados Unidos entró a la guerra inmediatamente en 1939 al ser invadida Polonia?",
                    "options": [],
                    "correct": "No, EE.UU. mantuvo una postura de neutralidad hasta el ataque a Pearl Harbor en diciembre de 1941.",
                    "explanation": "EE.UU. ingresó formalmente al conflicto a finales de 1941 tras el ataque japonés."
                }
            ],
            "Sistema Digestivo": [
                {
                    "type": "multiple_choice",
                    "prompt": "¿En qué parte del tubo digestivo ocurre la mayor absorción de nutrientes hacia el torrente sanguíneo?",
                    "options": ["Intestino delgado", "Estómago", "Boca", "Intestino grueso"],
                    "correct": "Intestino delgado",
                    "explanation": "Las vellocidades del intestino delgado absorben la inmensa mayoría de nutrientes."
                },
                {
                    "type": "cloze",
                    "prompt": "La enzima digestiva presente en la saliva que comienza a descomponer los almidones se llama ___.",
                    "options": [],
                    "correct": "amilasa",
                    "explanation": "La amilasa salival (o ptialina) inicia la digestión química de carbohidratos en la boca."
                },
                {
                    "type": "open_ended",
                    "prompt": "Describe el papel principal del ácido clorhídrico y la pepsina en el estómago.",
                    "options": [],
                    "correct": "El ácido clorhídrico destruye patógenos y activa la pepsina para descomponer las proteínas.",
                    "explanation": "El ambiente ácido del estómago es esencial para la digestión proteica."
                },
                {
                    "type": "examples",
                    "prompt": "Menciona un ejemplo de digestión mecánica realizada por el cuerpo humano.",
                    "options": [],
                    "correct": "La masticación en la boca o los movimientos peristálticos en el esófago y estómago.",
                    "explanation": "La digestión mecánica fragmenta físicamente los alimentos sin alterar su estructura química."
                },
                {
                    "type": "trick_question",
                    "prompt": "¿Es cierto que el hígado y el páncreas son órganos por los que circula directamente el bolo alimenticio?",
                    "options": [],
                    "correct": "Falso, son glándulas anexas que vierten secreciones pero el alimento nunca pasa a través de ellas.",
                    "explanation": "Hígado y páncreas secretan bilis y jugo pancreático hacia el duodeno."
                }
            ],
            "Teorema de Tales": [
                {
                    "type": "multiple_choice",
                    "prompt": "¿Qué propiedad establece el Teorema de Tales cuando varias rectas paralelas cortan a dos transversales?",
                    "options": ["Los segmentos resultantes son proporcionales", "Los ángulos resultantes siempre suman 90°", "Las áreas son perfectamente idénticas", "Las distancias se vuelven infinitas"],
                    "correct": "Los segmentos resultantes son proporcionales",
                    "explanation": "El Teorema de Tales relaciona las proporciones de segmentos cortados por paralelas."
                },
                {
                    "type": "cloze",
                    "prompt": "Se dice que dos triángulos son ___ si sus ángulos correspondientes son iguales y sus lados son proporcionales.",
                    "options": [],
                    "correct": "semejantes",
                    "explanation": "La semejanza geométrica es el concepto central derivado del Teorema de Tales."
                },
                {
                    "type": "open_ended",
                    "prompt": "Explica cómo usó Tales de Mileto su teorema para calcular la altura de la Gran Pirámide de Guiza.",
                    "options": [],
                    "correct": "Comparó la longitud de la sombra de la pirámide con la sombra de un bastón de altura conocida.",
                    "explanation": "Al medir las sombras en el mismo momento del día, la proporción bastón/sombra bastón es igual a pirámide/sombra pirámide."
                },
                {
                    "type": "examples",
                    "prompt": "Proporciona una aplicación práctica del Teorema de Tales en el dibujo técnico o la arquitectura.",
                    "options": [],
                    "correct": "División de un segmento en partes iguales o escalado de planos arquitectónicos.",
                    "explanation": "Permite ajustar escalas manteniendo la fidelidad de proporciones."
                },
                {
                    "type": "trick_question",
                    "prompt": "¿El Teorema de Tales solo se aplica si las transversales forman un ángulo de 90° con las paralelas?",
                    "options": [],
                    "correct": "Falso, el teorema se cumple con cualquier inclinación de las rectas transversales.",
                    "explanation": "La proporcionalidad se mantiene sin importar el ángulo de intersección."
                }
            ],
            "Fundamentos de Programación": [
                {
                    "type": "multiple_choice",
                    "prompt": "¿Qué palabra clave reservada se utiliza para declarar una función en Python?",
                    "options": ["def", "function", "fn", "define"],
                    "correct": "def",
                    "explanation": "En Python, la instrucción 'def' da inicio a la definición de una función."
                },
                {
                    "type": "cloze",
                    "prompt": "Una colección ordenada de elementos que NO se puede modificar después de crearla en Python es una ___.",
                    "options": [],
                    "correct": "tupla",
                    "explanation": "Las tuplas son inmutables a diferencia de las listas."
                },
                {
                    "type": "open_ended",
                    "prompt": "Explica la diferencia entre una estructura condicional 'if-else' y un bucle 'while'.",
                    "options": [],
                    "correct": "'if-else' ejecuta un bloque una sola vez según la condición, mientras que 'while' repite el bloque mientras la condición sea verdadera.",
                    "explanation": "El condicional decide ramificaciones; el bucle ejecuta iteraciones."
                },
                {
                    "type": "examples",
                    "prompt": "Proporciona un ejemplo del uso de la función print() en Python para mostrar texto y variables.",
                    "options": [],
                    "correct": "print(f'Hola {nombre}, tu puntaje es {score}')",
                    "explanation": "Las f-strings facilitan la interpolación limpia de variables."
                },
                {
                    "type": "trick_question",
                    "prompt": "¿El operador '=' en Python se utiliza para comparar si dos valores son exactamente iguales?",
                    "options": [],
                    "correct": "No, '=' es de asignación. Para comparar igualdad se requiere el operador '=='.",
                    "explanation": "Confundir '=' con '==' es uno de los errores sintácticos más comunes en programación."
                }
            ]
        }

        owner_id = student.id if student else admin.id
        total_notes = db.query(Note).count()

        for title, q_list in DEMO_SPECIFIC_QUESTIONS.items():
            existing = db.query(Note).filter(Note.title == title).first()
            if not existing:
                # SOLO crear si la base de datos está completamente vacía
                if total_notes == 0:
                    note = Note(
                        user_id=owner_id,
                        title=title,
                        content=f"Juego de estudio completo sobre {title}.",
                        is_free=True
                    )
                    db.add(note)
                    db.commit()
                    db.refresh(note)

                    for lvl in range(1, 6):
                        b = Block(note_id=note.id, level=lvl, is_completed=False)
                        db.add(b)
                        db.commit()
                        db.refresh(b)

                        for q_item in q_list:
                            q = Question(
                                block_id=b.id,
                                type=q_item["type"],
                                prompt=q_item["prompt"],
                                options_json=json.dumps(q_item.get("options", [])),
                                correct_answer=q_item["correct"],
                                explanation=q_item["explanation"]
                            )
                            db.add(q)
                        db.commit()
                    print(f"[SUCCESS] Juego Demo '{title}' creado con preguntas reales en la base de datos.")
            else:
                # Si el tema existe pero tiene preguntas plantilla, actualizar sus preguntas
                first_block = db.query(Block).filter(Block.note_id == existing.id).first()
                if first_block:
                    sample_q = db.query(Question).filter(Question.block_id == first_block.id).first()
                    if sample_q and ("Concepto Fundamental" in sample_q.prompt or "Distractor A" in sample_q.options_json):
                        # Reemplazar preguntas plantilla por preguntas reales
                        for b in existing.blocks:
                            db.query(Question).filter(Question.block_id == b.id).delete()
                            db.commit()
                            for q_item in q_list:
                                q = Question(
                                    block_id=b.id,
                                    type=q_item["type"],
                                    prompt=q_item["prompt"],
                                    options_json=json.dumps(q_item.get("options", [])),
                                    correct_answer=q_item["correct"],
                                    explanation=q_item["explanation"]
                                )
                                db.add(q)
                            db.commit()
                        print(f"[UPDATED] Preguntas del juego '{title}' actualizadas con contenido educativo real.")

        print("[COMPLETE] Siembra de datos completada satisfactoriamente.")

    except Exception as e:
        print(f"[ERROR] Error durante el seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
