from app.recommendation_service import get_similar_products

# Manually define what SHOULD be similar, using your actual seeded product IDs
expected_relevant = {
    3: [1, 2],  # iPhone 15 -> should surface Samsung Galaxy, MacBook (adjust to your real IDs/expectations)
}

def precision_at_k(product_id: int, relevant_ids: list[int], k: int = 5):
    results = get_similar_products(product_id, limit=k)
    top_ids = [r["productId"] for r in results]
    hits = sum(1 for pid in top_ids if pid in relevant_ids)
    return hits / k, top_ids

for product_id, relevant in expected_relevant.items():
    score, top_ids = precision_at_k(product_id, relevant)
    print(f"Product {product_id}: Precision@5 = {score:.2f}, top results: {top_ids}")