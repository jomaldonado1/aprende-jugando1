import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, RetryError

# Cargar variables de entorno desde .env
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

API_KEY = os.getenv("GEMINI_API_KEY")

# Lista de modelos por orden de preferencia para redundancia y alta disponibilidad
CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-1.5-flash"
]

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


def _generate_content_with_fallback(client: genai.Client, contents: str, config: types.GenerateContentConfig) -> str:
    """
    Intenta invocar la API de Gemini iterando sobre varios modelos candidatos.
    Si un modelo responde 503 UNAVAILABLE o 429 RESOURCE_EXHAUSTED, pasa automáticamente al siguiente modelo.
    """
    last_exception = None

    for model_name in CANDIDATE_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            if response.text:
                return response.text
        except Exception as e:
            last_exception = e
            print(f"[AI SERVICE WARN] Modelo {model_name} falló: {e}. Intentando modelo alternativo...")
            continue

    err_str = str(last_exception) if last_exception else "Respuesta vacía"
    if "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str:
        raise RuntimeError("Los servidores de IA están con alta demanda en este momento. Por favor reintenta en unos instantes.")
    raise RuntimeError(f"Error al invocar la API de Gemini: {err_str}")


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5), reraise=True)
def generate_study_game(title: str, content: str) -> StudyGameSchema:
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY no se encuentra configurada en las variables de entorno")

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

Devuelve la respuesta estrictamente formateada según el esquema JSON solicitado.
"""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=StudyGameSchema,
        temperature=0.4
    )

    response_text = _generate_content_with_fallback(client, prompt, config)
    data = json.loads(response_text)
    return StudyGameSchema(**data)


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5), reraise=True)
def evaluate_batch_open_answers(items: List[dict]) -> List[SingleEvaluationItem]:
    """
    Evalúa en UNA SOLA llamada API a Gemini todas las preguntas abiertas de un nivel.
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

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=BatchEvaluationResultSchema,
        temperature=0.2
    )

    response_text = _generate_content_with_fallback(client, prompt, config)
    data = json.loads(response_text)
    batch_res = BatchEvaluationResultSchema(**data)
    return batch_res.evaluations


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5), reraise=True)
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
3. `score` debe ser un número flotante entre 0.0 y 100.0.
4. `feedback` debe ser una explicación pedagógica muy breve (1 o 2 oraciones) y motivadora sobre la respuesta dada. IMPORTANTE: NO incluyas ni reveles la respuesta esperada literal en el campo feedback.

Devuelve la evaluación en JSON estricto.
"""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=EvaluationResultSchema,
        temperature=0.2
    )

    response_text = _generate_content_with_fallback(client, prompt, config)
    data = json.loads(response_text)
    return EvaluationResultSchema(**data)


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5), reraise=True)
def generate_hint(question_prompt: str, question_type: str, correct_answer: str) -> str:
    """
    Genera una pista socrática de máximo 15 palabras para guiar al alumno
    sin revelar la respuesta directamente ni usar sinónimos obvios.
    """
    if not API_KEY:
        return "Reflexiona sobre el concepto principal del enunciado."

    client = genai.Client(api_key=API_KEY)

    prompt = f"""Eres un tutor socrático estricto. Tu única tarea es dar UNA SOLA pista breve (máximo 15 palabras) para ayudar al alumno a deducir la respuesta por sí mismo.

REGLAS ABSOLUTAS:
- Máximo 15 palabras. Si superas 15 palabras, fallaste.
- NO menciones la respuesta correcta ni uses sinónimos directos de ella.
- NO uses las palabras exactas del enunciado de la pregunta.
- La pista debe invitar al razonamiento, no dar la solución.
- Responde SOLO con la pista, sin comillas, sin prefijos como "Pista:" ni explicaciones.

Pregunta: {question_prompt}
Tipo: {question_type}
Respuesta correcta (NO la reveles): {correct_answer}

Pista socrática:"""

    config = types.GenerateContentConfig(
        temperature=0.6,
        max_output_tokens=60
    )

    response_text = _generate_content_with_fallback(client, prompt, config)
    hint = response_text.strip().strip('"').strip("'")
    words = hint.split()
    if len(words) > 18:
        hint = " ".join(words[:15]) + "..."
    return hint
