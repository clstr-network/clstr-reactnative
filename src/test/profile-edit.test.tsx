import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditProfileModal from '@/components/profile/EditProfileModal';

describe('Profile Edit Flow', () => {
  const mockProfile = {
    name: 'John Doe',
    headline: 'Software Engineer',
    location: 'San Francisco, CA',
    batch: '2024',
    department: 'Computer Science',
    bio: 'Passionate developer',
    socialLinks: {
      website: 'https://johndoe.com',
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe',
      facebook: '',
      instagram: '',
    },
  };

  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the edit profile modal with existing data', () => {
    render(
      <EditProfileModal
        isOpen={true}
        onClose={mockOnClose}
        profile={mockProfile}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Passionate developer')).toBeInTheDocument();
  });

  it('should update form fields when user types', async () => {
    const user = userEvent.setup();
    
    render(
      <EditProfileModal
        isOpen={true}
        onClose={mockOnClose}
        profile={mockProfile}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue('John Doe');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Smith');

    expect(nameInput).toHaveValue('Jane Smith');
  });

  it('should validate required name field', async () => {
    const user = userEvent.setup();
    
    render(
      <EditProfileModal
        isOpen={true}
        onClose={mockOnClose}
        profile={mockProfile}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue('John Doe');
    await user.clear(nameInput);

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    // Form should not call onSave with empty name
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should call onSave with updated profile data', async () => {
    const user = userEvent.setup();
    
    render(
      <EditProfileModal
        isOpen={true}
        onClose={mockOnClose}
        profile={mockProfile}
        onSave={mockOnSave}
      />
    );

    const headlineInput = screen.getByDisplayValue('Software Engineer');
    await user.clear(headlineInput);
    await user.type(headlineInput, 'Senior Software Engineer');

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: 'Senior Software Engineer',
        })
      );
    });
  });

  it('should update social links fields', async () => {
    const user = userEvent.setup();
    
    render(
      <EditProfileModal
        isOpen={true}
        onClose={mockOnClose}
        profile={mockProfile}
        onSave={mockOnSave}
      />
    );

    // Open the Social Links accordion first
    const accordionTrigger = screen.getByText('Social Links');
    await user.click(accordionTrigger);

    const linkedinInput = screen.getByDisplayValue('https://linkedin.com/in/johndoe');
    await user.clear(linkedinInput);
    await user.type(linkedinInput, 'https://linkedin.com/in/janesmith');

    expect(linkedinInput).toHaveValue('https://linkedin.com/in/janesmith');
  });

  it('should close modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <EditProfileModal
        isOpen={true}
        onClose={mockOnClose}
        profile={mockProfile}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
