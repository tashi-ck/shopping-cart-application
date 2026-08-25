import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import { mockAuth0 } from '../test/mockAuth0';

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockAuth0(),
}));

vi.mock('../api/cartApi', () => ({
  getCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItemQuantity: vi.fn(),
  removeCartItem: vi.fn(),
}));

import { getCart, addCartItem, updateCartItemQuantity } from '../api/cartApi';

function TestConsumer() {
  const { cart, itemCount, addItem, updateQuantity, error } = useCart();
  return (
    <div>
      <p data-testid="item-count">{itemCount}</p>
      <p data-testid="error">{error}</p>
      <button onClick={() => addItem(1, 2)}>Add</button>
      <button onClick={() => updateQuantity(99, 5)}>Update</button>
    </div>
  );
}

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the cart on mount when authenticated', async () => {
    getCart.mockResolvedValue({
      data: { cartId: 1, items: [{ cartItemId: 1, quantity: 3 }], totalAmount: 30 },
    });

    render(<CartProvider><TestConsumer /></CartProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('item-count')).toHaveTextContent('3');
    });
  });

  it('adds an item and updates itemCount from the response', async () => {
    getCart.mockResolvedValue({ data: { cartId: 1, items: [], totalAmount: 0 } });
    addCartItem.mockResolvedValue({
      data: { cartId: 1, items: [{ cartItemId: 1, quantity: 2 }], totalAmount: 20 },
    });

    const user = userEventSetup();
    render(<CartProvider><TestConsumer /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId('item-count')).toHaveTextContent('0'));

    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByTestId('item-count')).toHaveTextContent('2');
    });
    expect(addCartItem).toHaveBeenCalledWith({ productId: 1, quantity: 2 });
  });

  it('surfaces a stock-limit error from the backend without crashing', async () => {
    getCart.mockResolvedValue({ data: { cartId: 1, items: [], totalAmount: 0 } });
    updateCartItemQuantity.mockRejectedValue({
      response: { data: 'Only 3 of Widget available.' },
    });

    const user = userEventSetup();
    render(<CartProvider><TestConsumer /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId('item-count')).toHaveTextContent('0'));

    await user.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Only 3 of Widget available.');
    });
  });
});

// small helper so this file doesn't need a top-level await for setup()
function userEventSetup() {
  const userEvent = require('@testing-library/user-event').default;
  return userEvent.setup();
}