import type { CondominiumsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGenerateCondominiumCodeOutput {
  code: string
}

export class GenerateCondominiumCodeService {
  constructor(private readonly repository: CondominiumsRepository) {}

  async execute(): Promise<TServiceResult<IGenerateCondominiumCodeOutput>> {
    const code = await this.generateUniqueCode()
    return success({ code })
  }

  private async generateUniqueCode(): Promise<string> {
    const maxAttempts = 10
    let attempts = 0

    while (attempts < maxAttempts) {
      const code = this.generateCode()
      const existing = await this.repository.getByCode(code)

      if (!existing) {
        return code
      }

      attempts++
    }

    // If we couldn't find a unique code after max attempts, add timestamp
    return this.generateCodeWithTimestamp()
  }

  private generateCode(): string {
    // Format: COND-XXXXX (5 random alphanumeric characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let suffix = ''

    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length)
      suffix += chars[randomIndex]
    }

    return `COND-${suffix}`
  }

  private generateCodeWithTimestamp(): string {
    // Format: COND-XXXXX-TIMESTAMP
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let suffix = ''

    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length)
      suffix += chars[randomIndex]
    }

    const timestamp = Date.now().toString(36).toUpperCase()
    return `COND-${suffix}-${timestamp}`
  }
}
