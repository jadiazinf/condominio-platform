export type TCreateEnumValue<T extends Record<string, string>> = T[keyof T]
