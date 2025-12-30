export const LocaleDictionary = {
  http: {
    middlewares: {
      utils: {
        auth: {
          malformedHeader: 'http.middlewares.utils.auth.malformedHeader',
          invalidToken: 'http.middlewares.utils.auth.invalidToken',
          userNotFound: 'http.middlewares.utils.auth.userNotFound',
          userDisabled: 'http.middlewares.utils.auth.userDisabled',
          notAuthenticated: 'http.middlewares.utils.auth.notAuthenticated',
          insufficientRoles: 'http.middlewares.utils.auth.insufficientRoles',
          insufficientPermissions: 'http.middlewares.utils.auth.insufficientPermissions',
          accessDenied: 'http.middlewares.utils.auth.accessDenied',
        },
      },
    },
    locales: {
      unknownError: 'http.locales.unknownError',
      validationError: 'http.locales.validationError',
      malformedBody: 'http.locales.malformedBody',
    },
    unhandledResponses: {
      internalError: 'http.unhandledResponses.internalError',
    },
  },
}
