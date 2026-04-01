import { type TServiceResult, success } from '../base.service'

type TLedgerRepo = {
  getBalance: (unitId: string, channelId: string) => Promise<string>
}

export interface IGetUnitBalanceInput {
  unitId: string
  billingChannelId: string
}

export interface IGetUnitBalanceOutput {
  unitId: string
  billingChannelId: string
  balance: string
}

export class GetUnitBalanceService {
  private ledgerRepo: TLedgerRepo

  constructor(ledgerRepo: TLedgerRepo) {
    this.ledgerRepo = ledgerRepo
  }

  async execute(input: IGetUnitBalanceInput): Promise<TServiceResult<IGetUnitBalanceOutput>> {
    const balance = await this.ledgerRepo.getBalance(input.unitId, input.billingChannelId)

    return success({
      unitId: input.unitId,
      billingChannelId: input.billingChannelId,
      balance,
    })
  }
}
