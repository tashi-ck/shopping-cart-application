from sentence_transformers import SentenceTransformer
import os
import re

MODEL_NAME = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")

# Loaded once at startup, not per-request — this is the expensive part
# (downloading/loading the model), so it must not happen on every call.
_model = SentenceTransformer(MODEL_NAME)

def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    return text

def build_product_text(name: str, category: str, description: str | None, brand: str | None = None) -> str:
    parts = [clean_text(name), clean_text(name)]
    parts.append(f"Category: {clean_text(category)}")
    if brand:
        parts.append(f"Brand: {clean_text(brand)}")
    if description:
        parts.append(clean_text(description))
    return ". ".join(parts)

def generate_embedding(text: str) -> list[float]:
    vector = _model.encode(text, normalize_embeddings=True)
    return vector.tolist()