import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import { mockAuth0 } from '../test/mockAuth0';

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockAuth0(),
}));

vi.mock('../hooks/useIsAdmin');
import { useIsAdmin } from '../hooks/useIsAdmin';

function renderWithRouter(initialEntry = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin" element={<AdminRoute><p>Admin content</p></AdminRoute>} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  it('shows a loading state while permissions are being checked', () => {
    useIsAdmin.mockReturnValue({ isAdmin: false, isLoading: true });

    renderWithRouter();

    expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
  });

  it('renders protected content for an admin user', () => {
    useIsAdmin.mockReturnValue({ isAdmin: true, isLoading: false });

    renderWithRouter();

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('redirects a non-admin user away, never rendering admin content', () => {
    useIsAdmin.mockReturnValue({ isAdmin: false, isLoading: false });

    renderWithRouter();

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });
});