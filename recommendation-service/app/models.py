from pydantic import BaseModel

class SimilarProduct(BaseModel):
    productId: int
    similarity: float

class SimilarProductsResponse(BaseModel):
    productId: int
    recommendations: list[SimilarProduct]