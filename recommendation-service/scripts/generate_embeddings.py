import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import get_connection
from app.embedding_service import build_product_text, generate_embedding, MODEL_NAME

def main():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                SELECT p."ProductId", p."Name", c."Name" AS "CategoryName", p."Description"
                FROM "Products" p
                JOIN "Categories" c ON c."CategoryId" = p."CategoryId"
                WHERE p."IsActive" = TRUE
                '''
            )
            products = cur.fetchall()

        print(f"Generating embeddings for {len(products)} products...")

        with conn.cursor() as cur:
            for product_id, name, category_name, description in products:
                text = build_product_text(name, category_name, description)
                embedding = generate_embedding(text)

                cur.execute(
                    '''
                    INSERT INTO "ProductEmbeddings" ("ProductId", "Embedding", "ModelName", "CreatedAt")
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT ("ProductId")
                    DO UPDATE SET "Embedding" = %s, "ModelName" = %s, "CreatedAt" = NOW()
                    ''',
                    (product_id, embedding, MODEL_NAME, embedding, MODEL_NAME),
                )
                print(f"  Product {product_id}: {name}")

    print("Done.")

if __name__ == "__main__":
    main()