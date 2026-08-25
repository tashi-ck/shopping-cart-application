import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineStatusBadge from './InlineStatusBadge';

describe('InlineStatusBadge', () => {
  it('renders the current status', () => {
    render(<InlineStatusBadge value="Pending" onChange={() => {}} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows "Updating..." and disables interaction while disabled prop is true', () => {
    render(<InlineStatusBadge value="Pending" onChange={() => {}} disabled />);

    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onChange with the newly selected status', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<InlineStatusBadge value="Pending" onChange={handleChange} />);

    await user.click(screen.getByText('Pending'));
    await user.click(screen.getByText('Shipped'));

    expect(handleChange).toHaveBeenCalledWith('Shipped');
  });
});