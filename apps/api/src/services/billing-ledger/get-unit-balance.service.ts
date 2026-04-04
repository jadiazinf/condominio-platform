import { type TServiceResult, success } from '../base.service'

type TLedgerRepo = {
  getBalance: (unitId: string, condominiumId: string) => Promise<string>
}

export interface IGetUnitBalanceInput {
  unitId: string
  condominiumId: string
}

export interface IGetUnitBalanceOutput {
  unitId: string
  condominiumId: string
  balance: string
}

export class GetUnitBalanceService {
  private ledgerRepo: TLedgerRepo

  constructor(ledgerRepo: TLedgerRepo) {
    this.ledgerRepo = ledgerRepo
  }

  async execute(input: IGetUnitBalanceInput): Promise<TServiceResult<IGetUnitBalanceOutput>> {
    const balance = await this.ledgerRepo.getBalance(input.unitId, input.condominiumId)

    return success({
      unitId: input.unitId,
      condominiumId: input.condominiumId,
      balance,
    })
  }
}
