export { setI18nAdapter, getI18nAdapter, t, createTranslateFunction } from './adapter'
export { DomainLocaleDictionary } from './dictionary'
export type { II18nAdapter, TTranslateFunction } from './types'

// Re-export locale files for apps to use
export { default as domainLocalesEs } from './locales/es.json'
export { default as domainLocalesEn } from './locales/en.json'
