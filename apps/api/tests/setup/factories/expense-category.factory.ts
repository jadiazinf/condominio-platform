import { faker } from '@faker-js/faker'
import type { TExpenseCategoryCreate } from '@packages/domain'

/**
 * Factory for creating expense category test data.
 */
export class ExpenseCategoryFactory {
  /**
   * Creates fake data for an expense category.
   */
  static create(overrides: Partial<TExpenseCategoryCreate> = {}): TExpenseCategoryCreate {
    return {
      name: faker.commerce.department(),
      description: faker.lorem.sentence(),
      parentCategoryId: null,
      isActive: true,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a child category.
   */
  static child(
    parentCategoryId: string,
    overrides: Partial<TExpenseCategoryCreate> = {}
  ): TExpenseCategoryCreate {
    return this.create({
      parentCategoryId,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive category.
   */
  static inactive(overrides: Partial<TExpenseCategoryCreate> = {}): TExpenseCategoryCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a maintenance category.
   */
  static maintenance(overrides: Partial<TExpenseCategoryCreate> = {}): TExpenseCategoryCreate {
    return this.create({
      name: 'Maintenance',
      description: 'General maintenance expenses',
      ...overrides,
    })
  }

  /**
   * Creates fake data for a services category.
   */
  static services(overrides: Partial<TExpenseCategoryCreate> = {}): TExpenseCategoryCreate {
    return this.create({
      name: 'Services',
      description: 'Utility and service expenses',
      ...overrides,
    })
  }

  /**
   * Creates fake data for an administrative category.
   */
  static administrative(overrides: Partial<TExpenseCategoryCreate> = {}): TExpenseCategoryCreate {
    return this.create({
      name: 'Administrative',
      description: 'Administrative and office expenses',
      ...overrides,
    })
  }
}
