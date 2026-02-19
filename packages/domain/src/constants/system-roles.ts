export const ESystemRole = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
  ACCOUNTANT: 'ACCOUNTANT',
  SUPPORT: 'SUPPORT',
  VIEWER: 'VIEWER',
} as const

export type TSystemRole = (typeof ESystemRole)[keyof typeof ESystemRole]
