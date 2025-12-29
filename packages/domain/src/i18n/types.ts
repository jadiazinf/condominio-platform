export type TTranslateFunction = (key: string) => string

export interface II18nAdapter {
  t: TTranslateFunction
}
