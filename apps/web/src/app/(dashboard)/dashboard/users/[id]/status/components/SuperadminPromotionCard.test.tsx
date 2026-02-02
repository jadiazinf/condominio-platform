import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuperadminPromotionCard } from './SuperadminPromotionCard'
import * as actions from '../../actions'

// Mock the actions
vi.mock('../../actions', () => ({
  promoteUserToSuperadminAction: vi.fn(),
  demoteUserFromSuperadminAction: vi.fn(),
}))

// Mock the toast
vi.mock('@/ui/components/toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('SuperadminPromotionCard', () => {
  const mockPermissions = [
    {
      id: 'perm-1',
      name: 'Read Users',
      module: 'users',
      action: 'read',
      description: 'Can view users',
    },
    {
      id: 'perm-2',
      name: 'Write Users',
      module: 'users',
      action: 'write',
      description: 'Can create/edit users',
    },
    {
      id: 'perm-3',
      name: 'Read Settings',
      module: 'settings',
      action: 'read',
    },
  ]

  const defaultProps = {
    userId: 'user-123',
    userDisplayName: 'John Doe',
    isSuperadmin: false,
    availablePermissions: mockPermissions,
    currentPermissionIds: [],
    promoteTitle: 'Promote to Superadmin',
    promoteDescription: 'This will grant superadmin access',
    demoteTitle: 'Demote from Superadmin',
    demoteDescription: 'This will remove superadmin access',
    promoteButtonText: 'Promote',
    demoteButtonText: 'Demote',
    modalTitle: 'Select Permissions',
    modalDescription: 'Choose permissions to grant',
    selectAllText: 'Select All',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    successMessage: 'Success',
    errorMessage: 'Error',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when user is not a superadmin', () => {
    it('should render promotion card', () => {
      render(<SuperadminPromotionCard {...defaultProps} />)

      expect(screen.getByText('Promote to Superadmin')).toBeInTheDocument()
      expect(screen.getByText('This will grant superadmin access')).toBeInTheDocument()
      expect(screen.getByText('Promote')).toBeInTheDocument()
    })

    it('should open modal when promote button is clicked', async () => {
      const user = userEvent.setup()
      render(<SuperadminPromotionCard {...defaultProps} />)

      const promoteButton = screen.getByText('Promote')
      await user.click(promoteButton)

      expect(screen.getByText('Select Permissions')).toBeInTheDocument()
      expect(screen.getByText('Choose permissions to grant')).toBeInTheDocument()
    })

    it('should display permissions grouped by module', async () => {
      const user = userEvent.setup()
      render(<SuperadminPromotionCard {...defaultProps} />)

      await user.click(screen.getByText('Promote'))

      expect(screen.getByText('users')).toBeInTheDocument()
      expect(screen.getByText('settings')).toBeInTheDocument()
      expect(screen.getByText('Read Users')).toBeInTheDocument()
      expect(screen.getByText('Write Users')).toBeInTheDocument()
      expect(screen.getByText('Read Settings')).toBeInTheDocument()
    })

    it('should toggle permission selection', async () => {
      const user = userEvent.setup()
      render(<SuperadminPromotionCard {...defaultProps} />)

      await user.click(screen.getByText('Promote'))

      const checkbox = screen.getByLabelText(/Read Users/i)
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('should call promoteUserToSuperadminAction with selected permissions', async () => {
      const user = userEvent.setup()
      const mockPromote = vi.mocked(actions.promoteUserToSuperadminAction)
      mockPromote.mockResolvedValue({ success: true })

      render(<SuperadminPromotionCard {...defaultProps} />)

      await user.click(screen.getByText('Promote'))

      // Select some permissions
      await user.click(screen.getByLabelText(/Read Users/i))
      await user.click(screen.getByLabelText(/Write Users/i))

      await user.click(screen.getByText('Confirm'))

      await waitFor(() => {
        expect(mockPromote).toHaveBeenCalledWith('user-123', expect.arrayContaining(['perm-1', 'perm-2']))
      })
    })

    it('should show error when trying to confirm without selecting permissions', async () => {
      const user = userEvent.setup()
      render(<SuperadminPromotionCard {...defaultProps} />)

      await user.click(screen.getByText('Promote'))

      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('when user is a superadmin', () => {
    it('should render demotion card', () => {
      render(<SuperadminPromotionCard {...defaultProps} isSuperadmin={true} />)

      expect(screen.getByText('Demote from Superadmin')).toBeInTheDocument()
      expect(screen.getByText('This will remove superadmin access')).toBeInTheDocument()
      expect(screen.getByText('Demote')).toBeInTheDocument()
    })

    it('should call demoteUserFromSuperadminAction when demote is confirmed', async () => {
      const user = userEvent.setup()
      const mockDemote = vi.mocked(actions.demoteUserFromSuperadminAction)
      mockDemote.mockResolvedValue({ success: true })

      // Mock window.confirm
      window.confirm = vi.fn(() => true)

      render(<SuperadminPromotionCard {...defaultProps} isSuperadmin={true} />)

      await user.click(screen.getByText('Demote'))

      await waitFor(() => {
        expect(mockDemote).toHaveBeenCalledWith('user-123')
      })
    })

    it('should not call demoteUserFromSuperadminAction when demote is cancelled', async () => {
      const user = userEvent.setup()
      const mockDemote = vi.mocked(actions.demoteUserFromSuperadminAction)

      // Mock window.confirm to return false
      window.confirm = vi.fn(() => false)

      render(<SuperadminPromotionCard {...defaultProps} isSuperadmin={true} />)

      await user.click(screen.getByText('Demote'))

      expect(mockDemote).not.toHaveBeenCalled()
    })
  })
})
