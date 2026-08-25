import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductDetailPage from './ProductDetailPage';
import { mockAuth0 } from '../test/mockAuth0';

const mockLoginWithRedirect = vi.fn();

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockAuth0({ isAuthenticated: false, loginWithRedirect: mockLoginWithRedirect }),
}));

vi.mock('../api/axiosClient', () => ({
  default: { get: vi.fn() },
}));
import axiosClient from '../api/axiosClient';

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/products/1']}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosClient.get.mockResolvedValue({
      data: {
        productId: 1, name: 'Widget', categoryName: 'Test', categoryId: 1,
        price: 25, stockQuantity: 3, description: 'A test widget.', imageUrl: null,
      },
    });
  });

  it('redirects to login when a logged-out user clicks Add to Cart', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());

    await user.click(screen.getByText('Add to cart'));

    expect(mockLoginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ appState: expect.objectContaining({ returnTo: expect.any(String) }) })
    );
  });

  it('caps the quantity stepper at available stock', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());

    const incrementButtons = screen.getAllByRole('button');
    const plusButton = incrementButtons.find((b) => b.querySelector('svg')); // the + icon button

    // Click + four times — stock is only 3, so quantity should never exceed 3
    for (let i = 0; i < 4; i++) {
      await user.click(plusButton);
    }

    expect(screen.getByText('3')).toBeInTheDocument(); // quantity display, capped at stock
  });
});