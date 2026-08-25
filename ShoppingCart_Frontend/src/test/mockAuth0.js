import { vi } from 'vitest';

export function mockAuth0(overrides = {}) {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: { email: 'test@example.com' },
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn().mockResolvedValue('fake-token'),
    ...overrides,
  };
}