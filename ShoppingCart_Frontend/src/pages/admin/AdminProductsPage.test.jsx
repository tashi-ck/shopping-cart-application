import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminProductsPage from './AdminProductsPage';

vi.mock('../../api/productApi', () => ({
  getProductsPaged: vi.fn(),
  getProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  setProductActive: vi.fn(),
}));
vi.mock('../../api/categoryApi', () => ({
  getCategories: vi.fn(),
}));
vi.mock('../../components/admin/ImageUpload', () => ({
  default: () => <div>Mock Upload</div>,
}));
vi.mock('../../components/admin/ProductGalleryManager', () => ({
  default: () => <div>Mock Gallery</div>,
}));

import { getProductsPaged, createProduct } from '../../api/productApi';
import { getCategories } from '../../api/categoryApi';

const emptyPage = { data: { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 15 } };

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductsPaged.mockResolvedValue(emptyPage);
    getCategories.mockResolvedValue({ data: [{ categoryId: 1, name: 'Electronics' }] });
  });

  it('creates a product from the drawer with correctly typed numeric fields', async () => {
    const user = userEvent.setup();
    createProduct.mockResolvedValue({ data: { productId: 5 } });

    render(
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /new product/i }));

    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByRole('combobox'), '1');

    const [nameInput] = within(dialog).getAllByRole('textbox');
    await user.type(nameInput, 'New Widget');

    const [priceInput, stockInput] = within(dialog).getAllByRole('spinbutton');
    await user.type(priceInput, '19.99');
    await user.type(stockInput, '10');

    await user.click(within(dialog).getByRole('button', { name: /create product/i }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 1, name: 'New Widget', price: 19.99, stockQuantity: 10 })
      );
    });

    const payload = createProduct.mock.calls[0][0];
    expect(typeof payload.price).toBe('number');
    expect(typeof payload.stockQuantity).toBe('number');
  });

  it('requests inactive products too, so admins can manage them', async () => {
    render(
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(getProductsPaged).toHaveBeenCalled());
    expect(getProductsPaged).toHaveBeenCalledWith(expect.objectContaining({ includeInactive: true }));
  });
});