from app.database import get_connection

def get_similar_products(product_id: int, limit: int = 10) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Fetch this product's own embedding
            cur.execute(
                'SELECT "Embedding" FROM "ProductEmbeddings" WHERE "ProductId" = %s',
                (product_id,),
            )
            row = cur.fetchone()

            if row is None:
                return []

            embedding = row[0]

            # Return only products with similarity >= 0.5
            cur.execute(
                '''
                SELECT "ProductId",
                       1 - ("Embedding" <=> %s) AS "Similarity"
                FROM "ProductEmbeddings"
                WHERE "ProductId" != %s
                  AND 1 - ("Embedding" <=> %s) >= 0.5
                ORDER BY "Embedding" <=> %s
                LIMIT %s
                ''',
                (embedding, product_id, embedding, embedding, limit),
            )

            results = cur.fetchall()

    return [
        {
            "productId": r[0],
            "similarity": float(r[1])
        }
        for r in results
    ]