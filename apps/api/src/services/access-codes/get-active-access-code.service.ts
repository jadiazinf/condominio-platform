import type { TCondominiumAccessCode } from '@packages/domain'
import type { CondominiumAccessCodesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetActiveAccessCodeInput {
  condominiumId: string
}

export class GetActiveAccessCodeService {
  constructor(
    private readonly accessCodesRepository: CondominiumAccessCodesRepository
  ) {}

  async execute(input: IGetActiveAccessCodeInput): Promise<TServiceResult<TCondominiumAccessCode | null>> {
    const code = await this.accessCodesRepository.getActiveByCondominiumId(input.condominiumId)

    // If code exists but expired, deactivate it
    if (code && new Date(code.expiresAt) <= new Date()) {
      await this.accessCodesRepository.update(code.id, { isActive: false })
      return success(null)
    }

    return success(code)
  }
}
