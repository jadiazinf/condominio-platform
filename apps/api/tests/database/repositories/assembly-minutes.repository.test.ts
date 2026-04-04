import { describe, it, expect } from 'bun:test'
import type { TAssemblyMinute, TAssemblyMinuteCreate } from '@packages/domain'

// ─── Domain model shape tests ───

function makeAssemblyMinute(overrides: Partial<TAssemblyMinute> = {}): TAssemblyMinute {
  return {
    id: 'am-1',
    condominiumId: 'condo-1',
    title: 'Asamblea ordinaria de propietarios',
    assemblyType: 'ordinary',
    assemblyDate: '2026-04-01',
    assemblyLocation: 'Salón de usos múltiples',
    quorumPercentage: '75.00',
    attendeesCount: 30,
    totalUnits: 40,
    agenda: '1. Aprobación del presupuesto 2026\n2. Elección de junta de condominio',
    decisions: [
      { point: 1, description: 'Presupuesto aprobado por unanimidad', approved: true },
      { point: 2, description: 'Nueva junta elegida', approved: true },
    ] as unknown as Record<string, unknown>,
    notes: 'Asamblea sin incidentes',
    documentUrl: 'https://firebase.storage/actas/am-1.pdf',
    documentFileName: 'acta-ordinaria-2026-04.pdf',
    status: 'draft',
    isActive: true,
    createdBy: 'user-admin-1',
    createdAt: new Date('2026-04-01T10:00:00Z'),
    updatedAt: new Date('2026-04-01T10:00:00Z'),
    ...overrides,
  }
}

describe('AssemblyMinute Domain Model', () => {
  it('creates a valid ordinary assembly minute', () => {
    const minute = makeAssemblyMinute()

    expect(minute.assemblyType).toBe('ordinary')
    expect(minute.status).toBe('draft')
    expect(minute.title).toBe('Asamblea ordinaria de propietarios')
    expect(minute.condominiumId).toBe('condo-1')
  })

  it('creates an extraordinary assembly minute', () => {
    const minute = makeAssemblyMinute({
      assemblyType: 'extraordinary',
      title: 'Asamblea extraordinaria — Reparación ascensor',
    })

    expect(minute.assemblyType).toBe('extraordinary')
    expect(minute.title).toContain('Reparación ascensor')
  })

  it('supports all statuses', () => {
    const draft = makeAssemblyMinute({ status: 'draft' })
    const approved = makeAssemblyMinute({ status: 'approved' })
    const voided = makeAssemblyMinute({ status: 'voided' })

    expect(draft.status).toBe('draft')
    expect(approved.status).toBe('approved')
    expect(voided.status).toBe('voided')
  })

  it('handles nullable fields correctly', () => {
    const minute = makeAssemblyMinute({
      assemblyLocation: null,
      quorumPercentage: null,
      attendeesCount: null,
      totalUnits: null,
      agenda: null,
      decisions: null,
      notes: null,
      documentUrl: null,
      documentFileName: null,
      createdBy: null,
    })

    expect(minute.assemblyLocation).toBeNull()
    expect(minute.quorumPercentage).toBeNull()
    expect(minute.agenda).toBeNull()
    expect(minute.documentUrl).toBeNull()
  })

  it('stores quorum as percentage decimal', () => {
    // Art. 23 LPH: quorum = 2/3 del valor = 66.67%
    const minute = makeAssemblyMinute({ quorumPercentage: '66.67' })

    expect(parseFloat(minute.quorumPercentage!)).toBeCloseTo(66.67)
  })

  it('stores decisions as structured JSON', () => {
    const decisions = [
      { point: 1, description: 'Aprobar presupuesto', approved: true, votes: 25 },
      { point: 2, description: 'Cobro extraordinario ascensor', approved: false, votes: 12 },
    ]
    const minute = makeAssemblyMinute({ decisions: decisions as unknown as Record<string, unknown> })

    const parsed = minute.decisions as unknown as typeof decisions
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.approved).toBe(true)
    expect(parsed[1]!.approved).toBe(false)
  })

  it('tracks document attachment', () => {
    const minute = makeAssemblyMinute({
      documentUrl: 'https://firebase.storage/actas/scan.pdf',
      documentFileName: 'acta-escaneada.pdf',
    })

    expect(minute.documentUrl).toContain('scan.pdf')
    expect(minute.documentFileName).toBe('acta-escaneada.pdf')
  })

  it('can be deactivated', () => {
    const minute = makeAssemblyMinute({ isActive: false })

    expect(minute.isActive).toBe(false)
  })

  // ─── Additional tests ───

  it('stores decisions as structured JSON array with multiple fields', () => {
    const decisions = [
      { point: 1, description: 'Aprobar presupuesto operativo 2026', approved: true, votes: 28, abstentions: 2 },
      { point: 2, description: 'Cobro extraordinario para impermeabilización', approved: true, votes: 25, abstentions: 5 },
      { point: 3, description: 'Cambio de empresa de vigilancia', approved: false, votes: 10, abstentions: 20 },
    ]
    const minute = makeAssemblyMinute({ decisions: decisions as unknown as Record<string, unknown> })

    const parsed = minute.decisions as unknown as typeof decisions
    expect(parsed).toHaveLength(3)
    expect(parsed[0]!.votes).toBe(28)
    expect(parsed[0]!.abstentions).toBe(2)
    expect(parsed[2]!.approved).toBe(false)
    // Each decision has a consistent structure
    for (const d of parsed) {
      expect(d).toHaveProperty('point')
      expect(d).toHaveProperty('description')
      expect(d).toHaveProperty('approved')
    }
  })

  it('extraordinary assembly requires quorum documentation', () => {
    // Art. 25 LPH: extraordinary assemblies need documented quorum
    const minute = makeAssemblyMinute({
      assemblyType: 'extraordinary',
      quorumPercentage: '75.00',
      attendeesCount: 30,
      totalUnits: 40,
    })

    expect(minute.assemblyType).toBe('extraordinary')
    expect(minute.quorumPercentage).toBe('75.00')
    expect(minute.attendeesCount).toBe(30)
    expect(minute.totalUnits).toBe(40)

    // Verify quorum is met (attendees/total >= quorum threshold)
    const actualQuorum = (minute.attendeesCount! / minute.totalUnits!) * 100
    expect(actualQuorum).toBe(75)

    // Extraordinary without quorum data is invalid at business level
    const noQuorum = makeAssemblyMinute({
      assemblyType: 'extraordinary',
      quorumPercentage: null,
      attendeesCount: null,
      totalUnits: null,
    })
    expect(noQuorum.quorumPercentage).toBeNull()
  })

  it('draft to approved status transition', () => {
    const draft = makeAssemblyMinute({ status: 'draft' })
    expect(draft.status).toBe('draft')

    // Simulate update: status transitions to approved
    const approved = makeAssemblyMinute({
      ...draft,
      status: 'approved',
      updatedAt: new Date('2026-04-05T14:00:00Z'),
    })
    expect(approved.status).toBe('approved')
    expect(approved.updatedAt.getTime()).toBeGreaterThan(draft.updatedAt.getTime())
  })

  it('multiple assemblies per condominium ordered by date DESC', () => {
    const assemblies = [
      makeAssemblyMinute({ id: 'am-1', assemblyDate: '2026-01-15', title: 'Asamblea Enero' }),
      makeAssemblyMinute({ id: 'am-2', assemblyDate: '2026-04-01', title: 'Asamblea Abril' }),
      makeAssemblyMinute({ id: 'am-3', assemblyDate: '2026-07-20', title: 'Asamblea Julio' }),
    ]

    // Sort DESC by assemblyDate (newest first) — simulating repo query order
    const sorted = [...assemblies].sort(
      (a, b) => new Date(b.assemblyDate).getTime() - new Date(a.assemblyDate).getTime()
    )

    expect(sorted[0]!.id).toBe('am-3')
    expect(sorted[1]!.id).toBe('am-2')
    expect(sorted[2]!.id).toBe('am-1')

    // All belong to same condominium
    for (const a of sorted) {
      expect(a.condominiumId).toBe('condo-1')
    }
  })
})
