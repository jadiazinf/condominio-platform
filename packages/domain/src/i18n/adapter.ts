import type { II18nAdapter, TTranslateFunction } from './types'

let i18nAdapter: II18nAdapter | null = null

export function setI18nAdapter(adapter: II18nAdapter): void {
  i18nAdapter = adapter
}

export function getI18nAdapter(): II18nAdapter | null {
  return i18nAdapter
}

export function t(key: string): string {
  if (i18nAdapter) {
    return i18nAdapter.t(key)
  }
  return key
}

export function createTranslateFunction(translateFn: TTranslateFunction): II18nAdapter {
  return {
    t: translateFn,
  }
}
