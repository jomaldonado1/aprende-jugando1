import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

# Cargar variables de entorno desde .env
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

API_KEY = os.getenv("GEMINI_API_KEY")

MODEL_NAME = "gemini-3.6-flash"

class QuestionSchema(BaseModel):
    type: str = Field(description="Tipo de pregunta: 'multiple_choice', 'cloze', 'open_ended', 'examples', o 'trick_question'")
    prompt: str = Field(description="El enunciado o consigna de la pregunta")
    options: List[str] = Field(default=[], description="Opciones (4 ítems para 'multiple_choice'; lista vacía [] para otros tipos)")
    correct_answer: str = Field(description="La respuesta correcta o la rúbrica/palabra esperada")
    explanation: str = Field(description="Explicación didáctica de por qué es la respuesta correcta")

class BlockSchema(BaseModel):
    level: int = Field(description="Número de nivel del 1 al 5")
    questions: List[QuestionSchema] = Field(description="Lista de 5 preguntas (una de cada tipo obligatorio)")

class StudyGameSchema(BaseModel):
    title: str = Field(description="Título estilizado del apunte")
    summary: str = Field(description="Resumen conceptual del apunte")
    blocks: List[BlockSchema] = Field(description="Lista de 5 bloques de dificultad progresiva")

class EvaluationResultSchema(BaseModel):
    is_correct: bool = Field(description="True si el estudiante comprendió el concepto clave principal, False si es incorrecto")
    score: float = Field(description="Calificación del 0 al 100 basada en el nivel de precisión conceptual")
    feedback: str = Field(description="Explicación didáctica breve sobre el acierto o corrección de la respuesta")

class SingleEvaluationItem(BaseModel):
    question_id: int = Field(description="ID de la pregunta evaluada")
    is_correct: bool = Field(description="True si el estudiante comprendió el concepto clave principal, False si es incorrecto")
    score: float = Field(description="Calificación del 0.0 al 100.0 basada en el nivel de precisión conceptual")
    feedback: str = Field(description="Explicación didáctica breve (1 o 2 oraciones) sin revelar la respuesta esperada literal")

class BatchEvaluationResultSchema(BaseModel):
    evaluations: List[SingleEvaluationItem] = Field(description="Lista de evaluaciones de las preguntas del cuestionario")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def generate_study_game(title: str, content: str) -> StudyGameSchema:
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY no se encuentra configurada en el archivo .env")

    try:
        client = genai.Client(api_key=API_KEY)

        prompt = f"""
Eres un Diseñador Instruccional Senior y Experto en Gamificación Educativa.
Analiza el siguiente apunte de estudio y genera un juego de lecciones estructurado en 5 NIVELES (Bloques) de dificultad progresiva.

Título del Apunte: {title}
Contenido del Apunte:
{content}

REQUISITOS ESTRUCTURALES OBLIGATORIOS:
1. Genera exactamente 5 niveles (bloques) etiquetados del 1 al 5.
   - Nivel 1: Conceptos Básicos e Introducción
   - Nivel 2: Comprensión y Definiciones
   - Nivel 3: Aplicación Práctica
   - Nivel 4: Análisis y Casos de Uso
   - Nivel 5: Dominio Avanzado y Trampas Frecuentes
2. Cada nivel DEBE incluir exactamente 5 preguntas, una de CADA UNO de los siguientes tipos:
   - 'multiple_choice': Pregunta con 4 opciones claras (1 correcta, 3 distractores convincentes).
   - 'cloze': Texto corto incompleto donde falta una palabra clave sustituida por '___'.
   - 'open_ended': Pregunta de desarrollo conceptual con rúbrica/respuesta esperada en 'correct_answer'.
   - 'examples': Pregunta que exige identificar un ejemplo práctico o caso de uso real.
   - 'trick_question': Pregunta capciosa o trampa común que aclare un malentendido habitual.

Devuelve la respuesta strictly formateada según el esquema JSON solicitado.
"""

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=StudyGameSchema,
                temperature=0.4
            )
        )

        if response.text:
            data = json.loads(response.text)
            return StudyGameSchema(**data)
        else:
            raise Exception("Respuesta vacía recibida de Gemini AI")

    except Exception as e:
        print(f"[AI SERVICE ERROR] Error generando juego de estudio con {MODEL_NAME}: {e}")
        raise RuntimeError(f"Error al invocar a Gemini API ({MODEL_NAME}): {e}")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def evaluate_batch_open_answers(items: List[dict]) -> List[SingleEvaluationItem]:
    """
    Evalúa en UNA SOLA llamada API a Gemini todas las preguntas abiertas de un nivel.
    Esto reduce en un 75% el número de peticiones HTTP, eliminando errores por saturación (HTTP 503 / 429).
    """
    if not items:
        return []

    if not API_KEY:
        results = []
        for item in items:
            exp = item.get("expected_answer", "").strip().lower()
            usr = item.get("user_answer", "").strip().lower()
            is_match = exp in usr or usr in exp if usr else False
            results.append(SingleEvaluationItem(
                question_id=item["question_id"],
                is_correct=is_match,
                score=100.0 if is_match else 0.0,
                feedback="Respuesta analizada por coincidencia sintáctica."
            ))
        return results

    client = genai.Client(api_key=API_KEY)

    prompt = f"""
Eres un Tutor Académico Inteligente y Evaluador Pedagógico.
Tu tarea es evaluar semánticamente una lista de respuestas dadas por un estudiante a las preguntas de su examen.

Lista de Preguntas y Respuestas a Evaluar:
{json.dumps(items, ensure_ascii=False, indent=2)}

INSTRUCCIONES DE EVALUACIÓN SEMÁNTICA BATCH:
1. Evalúa cada pregunta de la lista de forma independiente. Considera el SIGNIFICADO Y COMPRENSIÓN CONCEPTUAL, no la redacción exacta ni errores de tipeo.
2. Para cada elemento en la lista devuelta:
   - `question_id`: Debe coincidir exactamente con el `question_id` numérico de la pregunta evaluada.
   - `is_correct`: True si el estudiante demuestra comprender el concepto o idea clave principal, False si es incorrecto o erróneo.
   - `score`: Número flotante de 0.0 a 100.0.
   - `feedback`: Explicación didáctica muy breve (1 o 2 oraciones) y motivadora. IMPORTANTE: NO incluyas ni reveles la respuesta esperada literal en el campo feedback.

Devuelve la evaluación del lote en JSON estricto respetando el esquema.
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BatchEvaluationResultSchema,
            temperature=0.2
        )
    )

    if response.text:
        data = json.loads(response.text)
        batch_res = BatchEvaluationResultSchema(**data)
        return batch_res.evaluations
    else:
        raise Exception("Respuesta de evaluación batch vacía de Gemini AI")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def evaluate_open_answer(question_text: str, expected_answer: str, user_answer: str) -> EvaluationResultSchema:
    """
    Evalúa semánticamente una única respuesta en texto libre (función legado).
    """
    if not API_KEY:
        is_match = expected_answer.strip().lower() in user_answer.strip().lower() or user_answer.strip().lower() in expected_answer.strip().lower()
        return EvaluationResultSchema(
            is_correct=is_match,
            score=100.0 if is_match else 0.0,
            feedback="Respuesta analizada por coincidencia sintáctica."
        )

    client = genai.Client(api_key=API_KEY)

    prompt = f"""
Eres un Tutor Académico Inteligente y Evaluador Pedagógico.
Tu tarea es evaluar la respuesta dada por un estudiante a una pregunta de texto libre o conceptual.

Pregunta / Consigna: {question_text}
Respuesta / Rúbrica Esperada: {expected_answer}
Respuesta del Estudiante: {user_answer}

INSTRUCCIONES DE EVALUACIÓN SEMÁNTICA:
1. Evalúa el SIGNIFICADO Y COMPRENSIÓN CONCEPTUAL, no la redacción exacta ni errores menores de tipeo u ortografía.
2. `is_correct` debe ser TRUE si el estudiante demuestra haber entendido la idea principal o palabras clave fundamentales, o FALSE si su respuesta es incorrecta o vaga.
3. `score` debe ser un número flotante entre 0.0 y 100.0 (ej. 100 para excelente, 75 para aceptable, 0 para incorrecto).
4. `feedback` debe ser una explicación pedagógica muy breve (1 o 2 oraciones) y motivadora sobre la respuesta dada. IMPORTANTE: NO incluyas ni reveles la respuesta esperada literal en el campo feedback.

Devuelve la evaluación en JSON estricto.
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EvaluationResultSchema,
            temperature=0.2
        )
    )

    if response.text:
        data = json.loads(response.text)
        return EvaluationResultSchema(**data)
    else:
        raise Exception("Respuesta de evaluación vacía de Gemini AI")
