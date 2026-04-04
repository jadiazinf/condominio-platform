import { type TServiceResult, success, failure } from '@packages/services'
import type {
  OwnershipTransferSnapshotsRepository,
  UnitLedgerRepository,
  UnitsRepository,
} from '@packages/database'

export interface IGenerateTransferSnapshotInput {
  unitId: string
  previousOwnerId: string
  newOwnerId: string
  transferDate: string
  notes?: string
  createdBy?: string
}

export interface ITransferSnapshotOutput {
  id: string
  totalDebt: string
  hasDebt: boolean
  balance: string
}

export class GenerateOwnershipTransferSnapshotService {
  constructor(
    private readonly snapshotsRepo: OwnershipTransferSnapshotsRepository,
    private readonly ledgerRepo: UnitLedgerRepository,
    private readonly unitsRepo: UnitsRepository,
  ) {}

  async execute(input: IGenerateTransferSnapshotInput): Promise<TServiceResult<ITransferSnapshotOutput>> {
    const { unitId, previousOwnerId, newOwnerId, transferDate, notes, createdBy } = input

    // Get the unit to find its condominium
    const unit = await this.unitsRepo.getById(unitId)
    if (!unit) return failure('Unidad no encontrada', 'NOT_FOUND')

    const condominiumId = unit.condominiumId ?? unit.buildingId // fallback

    // Get balance for this unit in its condominium
    const lastEntry = await this.ledgerRepo.getLastEntry(unitId, condominiumId)
    const balance = lastEntry ? parseFloat(lastEntry.runningBalance) : 0
    const totalDebt = balance > 0 ? balance : 0

    const balanceSnapshot: Record<string, { balance: string; channelName: string; currency: string }> = {}
    if (lastEntry && balance !== 0) {
      balanceSnapshot[condominiumId] = {
        balance: lastEntry.runningBalance,
        channelName: condominiumId,
        currency: lastEntry.currencyId,
      }
    }

    // Create snapshot record
    const snapshot = await this.snapshotsRepo.create({
      unitId,
      previousOwnerId,
      newOwnerId,
      transferDate,
      balanceSnapshot,
      totalDebt: totalDebt.toFixed(2),
      debtCurrencyId: lastEntry?.currencyId ?? null,
      notes: notes ?? null,
      createdBy: createdBy ?? null,
    })

    return success({
      id: snapshot.id,
      totalDebt: totalDebt.toFixed(2),
      hasDebt: totalDebt > 0,
      balance: balance.toFixed(2),
    })
  }
}
