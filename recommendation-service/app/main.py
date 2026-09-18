from fastapi import FastAPI, HTTPException
from app.models import SimilarProductsResponse
from app.recommendation_service import get_similar_products
from app.embedding_service import build_product_text, generate_embedding, MODEL_NAME
from app.database import get_connection
from pydantic import BaseModel

app = FastAPI(title="Go Shopping Recommendation Service")

class GenerateEmbeddingRequest(BaseModel):
    productId: int
    name: str
    category: str
    description: str | None = None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/recommendations/products/{product_id}", response_model=SimilarProductsResponse)
def similar_products(product_id: int, limit: int = 10):
    recommendations = get_similar_products(product_id, limit)
    return SimilarProductsResponse(productId=product_id, recommendations=recommendations)

@app.post("/embeddings/generate")
def generate_embedding_endpoint(req: GenerateEmbeddingRequest):
    text = build_product_text(req.name, req.category, req.description)
    embedding = generate_embedding(text)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                INSERT INTO "ProductEmbeddings" ("ProductId", "Embedding", "ModelName", "CreatedAt")
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT ("ProductId")
                DO UPDATE SET "Embedding" = %s, "ModelName" = %s, "CreatedAt" = NOW()
                ''',
                (req.productId, embedding, MODEL_NAME, embedding, MODEL_NAME),
            )

    return {"status": "ok", "productId": req.productId}