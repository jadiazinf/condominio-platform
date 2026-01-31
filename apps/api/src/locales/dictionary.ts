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
          notSuperadmin: 'http.middlewares.utils.auth.notSuperadmin',
          superadminDisabled: 'http.middlewares.utils.auth.superadminDisabled',
          insufficientSuperadminPermissions:
            'http.middlewares.utils.auth.insufficientSuperadminPermissions',
          noTicketAccess: 'http.middlewares.utils.auth.noTicketAccess',
        },
      },
    },
    controllers: {
      supportTickets: {
        ticketNotFound: 'http.controllers.supportTickets.ticketNotFound',
        ticketClosed: 'http.controllers.supportTickets.ticketClosed',
        messageNotFound: 'http.controllers.supportTickets.messageNotFound',
        cannotAddMessageToClosed: 'http.controllers.supportTickets.cannotAddMessageToClosed',
        failedToCreateMessage: 'http.controllers.supportTickets.failedToCreateMessage',
        operationFailed: 'http.controllers.supportTickets.operationFailed',
        invalidStatusTransition: 'http.controllers.supportTickets.invalidStatusTransition',
        invalidAttachmentType: 'http.controllers.supportTickets.invalidAttachmentType',
        attachmentTooLarge: 'http.controllers.supportTickets.attachmentTooLarge',
        statusTransitions: {
          closedNoTransition: 'http.controllers.supportTickets.statusTransitions.closedNoTransition',
          cancelledNoTransition: 'http.controllers.supportTickets.statusTransitions.cancelledNoTransition',
          openToResolved: 'http.controllers.supportTickets.statusTransitions.openTo.resolved',
          openToClosed: 'http.controllers.supportTickets.statusTransitions.openTo.closed',
          inProgressToOpen: 'http.controllers.supportTickets.statusTransitions.inProgressTo.open',
          waitingCustomerToOpen: 'http.controllers.supportTickets.statusTransitions.waitingCustomerTo.open',
          resolvedToOpen: 'http.controllers.supportTickets.statusTransitions.resolvedTo.open',
          resolvedToWaitingCustomer: 'http.controllers.supportTickets.statusTransitions.resolvedTo.waiting_customer',
          resolvedToCancelled: 'http.controllers.supportTickets.statusTransitions.resolvedTo.cancelled',
        },
      },
    },
    locales: {
      unknownError: 'http.locales.unknownError',
      validationError: 'http.locales.validationError',
      malformedBody: 'http.locales.malformedBody',
    },
    validation: {
      invalidIdFormat: 'http.validation.invalidIdFormat',
      invalidUserIdFormat: 'http.validation.invalidUserIdFormat',
      invalidTicketIdFormat: 'http.validation.invalidTicketIdFormat',
      expectedString: 'http.validation.expectedString',
      expectedRecord: 'http.validation.expectedRecord',
      expectedArray: 'http.validation.expectedArray',
      invalidDateFormat: 'http.validation.invalidDateFormat',
      invalidOption: 'http.validation.invalidOption',
    },
    unhandledResponses: {
      internalError: 'http.unhandledResponses.internalError',
    },
  },
}
