import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminProductsPage from './AdminProductsPage';

vi.mock('../../api/productApi', () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  setProductActive: vi.fn(),
}));
vi.mock('../../api/categoryApi', () => ({
  getCategories: vi.fn(),
}));
vi.mock('../../components/admin/ImageUpload', () => ({
  default: ({ value, onChange }) => (
    <button onClick={() => onChange('https://example.com/test.jpg')}>Mock Upload</button>
  ),
}));

import { getProducts, createProduct } from '../../api/productApi';
import { getCategories } from '../../api/categoryApi';

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProducts.mockResolvedValue({ data: [] });
    getCategories.mockResolvedValue({
      data: [{ categoryId: 1, name: 'Electronics' }],
    });
  });

  it('submits a new product with correctly typed numeric fields', async () => {
    const user = userEvent.setup();
    createProduct.mockResolvedValue({
      data: { productId: 5, name: 'New Widget', categoryName: 'Electronics', price: 19.99, stockQuantity: 10, isActive: true },
    });

    render(<AdminProductsPage />);

    await waitFor(() => expect(screen.getByText('Electronics')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox'), '1');

    // getAllByRole('textbox') returns [Name input, Description textarea], in DOM order —
    // both share role="textbox" regardless of element type
    const [nameInput] = screen.getAllByRole('textbox');
    await user.type(nameInput, 'New Widget');

    const [priceInput, stockInput] = screen.getAllByRole('spinbutton'); // price + stock number inputs
    await user.type(priceInput, '19.99');
    await user.type(stockInput, '10');

    await user.click(screen.getByText('Add product'));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 1, price: 19.99, stockQuantity: 10 })
      );
    });

    const callArg = createProduct.mock.calls[0][0];
    expect(typeof callArg.price).toBe('number');
    expect(typeof callArg.stockQuantity).toBe('number');
  });
});