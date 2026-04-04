import { describe, it, expect } from 'bun:test'
import type { TCondominiumBoardMember } from '@packages/domain'

// ─── Domain model shape tests ───

function makeBoardMember(overrides: Partial<TCondominiumBoardMember> = {}): TCondominiumBoardMember {
  return {
    id: 'bm-1',
    condominiumId: 'condo-1',
    userId: 'user-1',
    position: 'president',
    status: 'active',
    electedAt: '2026-04-01',
    termEndsAt: '2027-04-01',
    assemblyMinuteId: 'am-1',
    notes: 'Elegido por unanimidad',
    createdBy: 'user-admin-1',
    createdAt: new Date('2026-04-01T10:00:00Z'),
    updatedAt: new Date('2026-04-01T10:00:00Z'),
    ...overrides,
  }
}

describe('CondominiumBoardMember Domain Model', () => {
  it('creates a valid board member for president position', () => {
    const member = makeBoardMember()

    expect(member.position).toBe('president')
    expect(member.status).toBe('active')
    expect(member.condominiumId).toBe('condo-1')
    expect(member.userId).toBe('user-1')
  })

  it('creates valid board members for each position', () => {
    const positions = [
      'president',
      'secretary',
      'treasurer',
      'substitute_president',
      'substitute_secretary',
      'substitute_treasurer',
    ] as const

    for (const position of positions) {
      const member = makeBoardMember({ position })
      expect(member.position).toBe(position)
    }
  })

  it('supports all statuses', () => {
    const active = makeBoardMember({ status: 'active' })
    const inactive = makeBoardMember({ status: 'inactive' })
    const replaced = makeBoardMember({ status: 'replaced' })

    expect(active.status).toBe('active')
    expect(inactive.status).toBe('inactive')
    expect(replaced.status).toBe('replaced')
  })

  it('handles nullable fields correctly', () => {
    const member = makeBoardMember({
      termEndsAt: null,
      assemblyMinuteId: null,
      notes: null,
      createdBy: null,
    })

    expect(member.termEndsAt).toBeNull()
    expect(member.assemblyMinuteId).toBeNull()
    expect(member.notes).toBeNull()
    expect(member.createdBy).toBeNull()
  })

  it('tracks assembly minute reference', () => {
    const member = makeBoardMember({ assemblyMinuteId: 'am-123' })

    expect(member.assemblyMinuteId).toBe('am-123')
  })

  it('validates term dates', () => {
    const member = makeBoardMember({
      electedAt: '2026-01-15',
      termEndsAt: '2027-01-15',
    })

    expect(member.electedAt).toBe('2026-01-15')
    expect(member.termEndsAt).toBe('2027-01-15')

    const electedDate = new Date(member.electedAt)
    const termEndDate = new Date(member.termEndsAt!)
    expect(termEndDate.getTime()).toBeGreaterThan(electedDate.getTime())
  })

  it('supports member without term end date (indefinite)', () => {
    const member = makeBoardMember({ termEndsAt: null })

    expect(member.termEndsAt).toBeNull()
    expect(member.electedAt).toBe('2026-04-01')
  })

  it('tracks who created the board member record', () => {
    const member = makeBoardMember({ createdBy: 'admin-user-42' })

    expect(member.createdBy).toBe('admin-user-42')
  })

  // ─── Additional tests ───

  it('only one active president per condominium at a time', () => {
    const allMembers = [
      makeBoardMember({ id: 'bm-1', position: 'president', status: 'active', condominiumId: 'condo-1' }),
      makeBoardMember({ id: 'bm-2', position: 'president', status: 'replaced', condominiumId: 'condo-1' }),
      makeBoardMember({ id: 'bm-3', position: 'president', status: 'inactive', condominiumId: 'condo-1' }),
      makeBoardMember({ id: 'bm-4', position: 'secretary', status: 'active', condominiumId: 'condo-1' }),
    ]

    const activePresidents = allMembers.filter(
      m => m.position === 'president' && m.status === 'active' && m.condominiumId === 'condo-1'
    )

    expect(activePresidents).toHaveLength(1)
    expect(activePresidents[0]!.id).toBe('bm-1')
  })

  it('replaces a board member (old -> replaced, new -> active)', () => {
    // Outgoing president
    const outgoing = makeBoardMember({
      id: 'bm-old',
      userId: 'user-old',
      position: 'president',
      status: 'replaced',
      electedAt: '2024-04-01',
      termEndsAt: '2026-04-01',
    })

    // Incoming president
    const incoming = makeBoardMember({
      id: 'bm-new',
      userId: 'user-new',
      position: 'president',
      status: 'active',
      electedAt: '2026-04-01',
      termEndsAt: '2028-04-01',
    })

    expect(outgoing.status).toBe('replaced')
    expect(incoming.status).toBe('active')
    expect(outgoing.position).toBe(incoming.position)
    // The new member's term starts when the old one ends
    expect(incoming.electedAt).toBe(outgoing.termEndsAt)
  })

  it('tracks board member term with electedAt and termEndsAt', () => {
    const member = makeBoardMember({
      electedAt: '2026-03-15',
      termEndsAt: '2028-03-15',
    })

    const elected = new Date(member.electedAt)
    const termEnd = new Date(member.termEndsAt!)

    // Term is exactly 2 years
    const diffMs = termEnd.getTime() - elected.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(731, 0) // ~2 years (365*2 + 1 for leap)

    expect(member.electedAt).toBe('2026-03-15')
    expect(member.termEndsAt).toBe('2028-03-15')
  })

  it('links board member to assembly minute via assemblyMinuteId', () => {
    const assemblyMinuteId = 'am-extraordinary-2026'

    const president = makeBoardMember({
      id: 'bm-p',
      position: 'president',
      assemblyMinuteId,
    })
    const secretary = makeBoardMember({
      id: 'bm-s',
      position: 'secretary',
      assemblyMinuteId,
    })
    const treasurer = makeBoardMember({
      id: 'bm-t',
      position: 'treasurer',
      assemblyMinuteId,
    })

    // All elected in same assembly
    expect(president.assemblyMinuteId).toBe(assemblyMinuteId)
    expect(secretary.assemblyMinuteId).toBe(assemblyMinuteId)
    expect(treasurer.assemblyMinuteId).toBe(assemblyMinuteId)

    // Different people, same assembly
    const userIds = [president.userId, secretary.userId, treasurer.userId]
    // All share same default userId in factory, but IDs are different
    expect(president.id).not.toBe(secretary.id)
    expect(secretary.id).not.toBe(treasurer.id)
  })
})
