import type { TCondominiumAccessCode, TAccessCodeValidity } from '@packages/domain'
import type { CondominiumAccessCodesRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

const VALIDITY_TO_MS: Record<TAccessCodeValidity, number> = {
  '1_day': 24 * 60 * 60 * 1000,
  '7_days': 7 * 24 * 60 * 60 * 1000,
  '1_month': 30 * 24 * 60 * 60 * 1000,
  '1_year': 365 * 24 * 60 * 60 * 1000,
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[bytes[i]! % CODE_CHARS.length]
  }
  return code
}

export interface IGenerateAccessCodeInput {
  condominiumId: string
  validity: TAccessCodeValidity
  createdBy: string
}

export class GenerateAccessCodeService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly accessCodesRepository: CondominiumAccessCodesRepository
  ) {}

  async execute(input: IGenerateAccessCodeInput): Promise<TServiceResult<TCondominiumAccessCode>> {
    const { condominiumId, validity, createdBy } = input

    const expiresAt = new Date(Date.now() + VALIDITY_TO_MS[validity])

    return await this.db.transaction(async tx => {
      const txRepo = this.accessCodesRepository.withTx(tx)

      // Deactivate all existing codes for this condominium
      await txRepo.deactivateAllForCondominium(condominiumId)

      // Generate a unique code (retry up to 5 times for collisions)
      let code: string = ''
      for (let attempt = 0; attempt < 5; attempt++) {
        code = generateCode()
        const existing = await txRepo.getByCode(code)
        if (!existing) break
        if (attempt === 4) {
          return failure('Failed to generate unique code', 'INTERNAL_ERROR')
        }
      }

      const accessCode = await txRepo.create({
        condominiumId,
        code,
        expiresAt,
        isActive: true,
        createdBy,
      })

      return success(accessCode)
    })
  }
}
