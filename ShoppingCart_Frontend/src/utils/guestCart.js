const STORAGE_KEY = "guestCart";

function readItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Builds the same shape your server CartDto returns, so every component that
// consumes `cart` from CartContext works identically regardless of which
// backing store (server or localStorage) is actually active.
function toCartDto(items) {
  const dtoItems = items.map((i) => ({
    cartItemId: i.productId, // guests have no real cart-item ID — productId doubles as a stable key
    productId: i.productId,
    productName: i.productName,
    imageUrl: i.imageUrl,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    lineTotal: i.unitPrice * i.quantity,
    stockQuantity: i.stockQuantity,
  }));
  const totalAmount = dtoItems.reduce((sum, i) => sum + i.lineTotal, 0);
  return { cartId: null, items: dtoItems, totalAmount };
}

export function getGuestCart() {
  return toCartDto(readItems());
}

export function addGuestCartItem(product, quantity) {
  const items = readItems();
  const existing = items.find((i) => i.productId === product.productId);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, product.stockQuantity);
  } else {
    items.push({
      productId: product.productId,
      productName: product.name,
      imageUrl: product.imageUrl,
      unitPrice: product.price,
      quantity: Math.min(quantity, product.stockQuantity),
      stockQuantity: product.stockQuantity,
    });
  }

  writeItems(items);
  return toCartDto(items);
}

export function updateGuestCartItemQuantity(productId, quantity) {
  const items = readItems();
  const item = items.find((i) => i.productId === productId);
  if (item) item.quantity = Math.min(quantity, item.stockQuantity);
  writeItems(items);
  return toCartDto(items);
}

export function removeGuestCartItem(productId) {
  const items = readItems().filter((i) => i.productId !== productId);
  writeItems(items);
  return toCartDto(items);
}

export function clearGuestCart() {
  writeItems([]);
  return toCartDto([]);
}