export const DomainLocaleDictionary = {
  validation: {
    common: {
      required: 'validation.common.required',
      invalidType: 'validation.common.invalidType',
      invalidUuid: 'validation.common.invalidUuid',
      invalidEmail: 'validation.common.invalidEmail',
      invalidUrl: 'validation.common.invalidUrl',
      invalidDate: 'validation.common.invalidDate',
      invalidEnum: 'validation.common.invalidEnum',
      stringMin: 'validation.common.stringMin',
      stringMax: 'validation.common.stringMax',
      numberMin: 'validation.common.numberMin',
      numberMax: 'validation.common.numberMax',
      numberInt: 'validation.common.numberInt',
      numberPositive: 'validation.common.numberPositive',
      arrayMin: 'validation.common.arrayMin',
      arrayMax: 'validation.common.arrayMax',
    },
    models: {
      users: {
        firebaseUid: {
          required: 'validation.models.users.firebaseUid.required',
          max: 'validation.models.users.firebaseUid.max',
        },
        email: {
          required: 'validation.models.users.email.required',
          invalid: 'validation.models.users.email.invalid',
          max: 'validation.models.users.email.max',
        },
        displayName: {
          max: 'validation.models.users.displayName.max',
        },
        phoneNumber: {
          max: 'validation.models.users.phoneNumber.max',
        },
        photoUrl: {
          invalid: 'validation.models.users.photoUrl.invalid',
        },
        firstName: {
          max: 'validation.models.users.firstName.max',
        },
        lastName: {
          max: 'validation.models.users.lastName.max',
        },
        idDocumentType: {
          invalid: 'validation.models.users.idDocumentType.invalid',
        },
        idDocumentNumber: {
          max: 'validation.models.users.idDocumentNumber.max',
        },
        address: {
          max: 'validation.models.users.address.max',
        },
        locationId: {
          invalid: 'validation.models.users.locationId.invalid',
        },
        preferredLanguage: {
          invalid: 'validation.models.users.preferredLanguage.invalid',
        },
        preferredCurrencyId: {
          invalid: 'validation.models.users.preferredCurrencyId.invalid',
        },
      },
      condominiums: {
        name: {
          required: 'validation.models.condominiums.name.required',
          max: 'validation.models.condominiums.name.max',
        },
        code: {
          max: 'validation.models.condominiums.code.max',
        },
        managementCompanyId: {
          invalid: 'validation.models.condominiums.managementCompanyId.invalid',
        },
        address: {
          max: 'validation.models.condominiums.address.max',
        },
        locationId: {
          invalid: 'validation.models.condominiums.locationId.invalid',
        },
        email: {
          invalid: 'validation.models.condominiums.email.invalid',
          max: 'validation.models.condominiums.email.max',
        },
        phone: {
          max: 'validation.models.condominiums.phone.max',
        },
        defaultCurrencyId: {
          invalid: 'validation.models.condominiums.defaultCurrencyId.invalid',
        },
      },
      buildings: {
        name: {
          required: 'validation.models.buildings.name.required',
          max: 'validation.models.buildings.name.max',
        },
        code: {
          max: 'validation.models.buildings.code.max',
        },
        condominiumId: {
          required: 'validation.models.buildings.condominiumId.required',
          invalid: 'validation.models.buildings.condominiumId.invalid',
        },
        address: {
          max: 'validation.models.buildings.address.max',
        },
        floorsCount: {
          invalid: 'validation.models.buildings.floorsCount.invalid',
        },
        unitsCount: {
          invalid: 'validation.models.buildings.unitsCount.invalid',
        },
      },
      units: {
        buildingId: {
          required: 'validation.models.units.buildingId.required',
          invalid: 'validation.models.units.buildingId.invalid',
        },
        unitNumber: {
          required: 'validation.models.units.unitNumber.required',
          max: 'validation.models.units.unitNumber.max',
        },
        floor: {
          invalid: 'validation.models.units.floor.invalid',
        },
        areaM2: {
          invalid: 'validation.models.units.areaM2.invalid',
        },
        bedrooms: {
          invalid: 'validation.models.units.bedrooms.invalid',
        },
        bathrooms: {
          invalid: 'validation.models.units.bathrooms.invalid',
        },
        parkingSpaces: {
          invalid: 'validation.models.units.parkingSpaces.invalid',
        },
        aliquotPercentage: {
          invalid: 'validation.models.units.aliquotPercentage.invalid',
        },
      },
      payments: {
        userId: {
          required: 'validation.models.payments.userId.required',
          invalid: 'validation.models.payments.userId.invalid',
        },
        unitId: {
          required: 'validation.models.payments.unitId.required',
          invalid: 'validation.models.payments.unitId.invalid',
        },
        amount: {
          required: 'validation.models.payments.amount.required',
          invalid: 'validation.models.payments.amount.invalid',
        },
        currencyId: {
          required: 'validation.models.payments.currencyId.required',
          invalid: 'validation.models.payments.currencyId.invalid',
        },
        paymentMethod: {
          required: 'validation.models.payments.paymentMethod.required',
          invalid: 'validation.models.payments.paymentMethod.invalid',
        },
        paymentDate: {
          required: 'validation.models.payments.paymentDate.required',
          invalid: 'validation.models.payments.paymentDate.invalid',
        },
        status: {
          invalid: 'validation.models.payments.status.invalid',
        },
      },
      quotas: {
        unitId: {
          required: 'validation.models.quotas.unitId.required',
          invalid: 'validation.models.quotas.unitId.invalid',
        },
        paymentConceptId: {
          required: 'validation.models.quotas.paymentConceptId.required',
          invalid: 'validation.models.quotas.paymentConceptId.invalid',
        },
        periodYear: {
          required: 'validation.models.quotas.periodYear.required',
          invalid: 'validation.models.quotas.periodYear.invalid',
        },
        periodMonth: {
          min: 'validation.models.quotas.periodMonth.min',
          max: 'validation.models.quotas.periodMonth.max',
        },
        baseAmount: {
          required: 'validation.models.quotas.baseAmount.required',
          invalid: 'validation.models.quotas.baseAmount.invalid',
        },
        currencyId: {
          required: 'validation.models.quotas.currencyId.required',
          invalid: 'validation.models.quotas.currencyId.invalid',
        },
        issueDate: {
          required: 'validation.models.quotas.issueDate.required',
          invalid: 'validation.models.quotas.issueDate.invalid',
        },
        dueDate: {
          required: 'validation.models.quotas.dueDate.required',
          invalid: 'validation.models.quotas.dueDate.invalid',
        },
        status: {
          invalid: 'validation.models.quotas.status.invalid',
        },
      },
      roles: {
        name: {
          required: 'validation.models.roles.name.required',
          max: 'validation.models.roles.name.max',
        },
        description: {
          max: 'validation.models.roles.description.max',
        },
      },
      permissions: {
        name: {
          required: 'validation.models.permissions.name.required',
          max: 'validation.models.permissions.name.max',
        },
        module: {
          required: 'validation.models.permissions.module.required',
          invalid: 'validation.models.permissions.module.invalid',
        },
        action: {
          required: 'validation.models.permissions.action.required',
          invalid: 'validation.models.permissions.action.invalid',
        },
      },
      currencies: {
        code: {
          required: 'validation.models.currencies.code.required',
          max: 'validation.models.currencies.code.max',
        },
        name: {
          required: 'validation.models.currencies.name.required',
          max: 'validation.models.currencies.name.max',
        },
        symbol: {
          max: 'validation.models.currencies.symbol.max',
        },
        decimals: {
          invalid: 'validation.models.currencies.decimals.invalid',
        },
      },
      locations: {
        name: {
          required: 'validation.models.locations.name.required',
          max: 'validation.models.locations.name.max',
        },
        locationType: {
          required: 'validation.models.locations.locationType.required',
          invalid: 'validation.models.locations.locationType.invalid',
        },
        code: {
          max: 'validation.models.locations.code.max',
        },
      },
      expenses: {
        description: {
          required: 'validation.models.expenses.description.required',
        },
        expenseDate: {
          required: 'validation.models.expenses.expenseDate.required',
          invalid: 'validation.models.expenses.expenseDate.invalid',
        },
        amount: {
          required: 'validation.models.expenses.amount.required',
          invalid: 'validation.models.expenses.amount.invalid',
        },
        currencyId: {
          required: 'validation.models.expenses.currencyId.required',
          invalid: 'validation.models.expenses.currencyId.invalid',
        },
        vendorName: {
          max: 'validation.models.expenses.vendorName.max',
        },
        vendorTaxId: {
          max: 'validation.models.expenses.vendorTaxId.max',
        },
        invoiceNumber: {
          max: 'validation.models.expenses.invoiceNumber.max',
        },
        status: {
          invalid: 'validation.models.expenses.status.invalid',
        },
      },
      documents: {
        documentType: {
          required: 'validation.models.documents.documentType.required',
          invalid: 'validation.models.documents.documentType.invalid',
        },
        title: {
          required: 'validation.models.documents.title.required',
          max: 'validation.models.documents.title.max',
        },
        fileUrl: {
          required: 'validation.models.documents.fileUrl.required',
          invalid: 'validation.models.documents.fileUrl.invalid',
        },
        fileName: {
          max: 'validation.models.documents.fileName.max',
        },
        fileType: {
          max: 'validation.models.documents.fileType.max',
        },
      },
      messages: {
        senderId: {
          required: 'validation.models.messages.senderId.required',
          invalid: 'validation.models.messages.senderId.invalid',
        },
        recipientType: {
          required: 'validation.models.messages.recipientType.required',
          invalid: 'validation.models.messages.recipientType.invalid',
        },
        body: {
          required: 'validation.models.messages.body.required',
        },
        subject: {
          max: 'validation.models.messages.subject.max',
        },
        messageType: {
          invalid: 'validation.models.messages.messageType.invalid',
        },
        priority: {
          invalid: 'validation.models.messages.priority.invalid',
        },
      },
      auditLogs: {
        tableName: {
          required: 'validation.models.auditLogs.tableName.required',
          max: 'validation.models.auditLogs.tableName.max',
        },
        recordId: {
          required: 'validation.models.auditLogs.recordId.required',
          invalid: 'validation.models.auditLogs.recordId.invalid',
        },
        action: {
          required: 'validation.models.auditLogs.action.required',
          invalid: 'validation.models.auditLogs.action.invalid',
        },
        userId: {
          invalid: 'validation.models.auditLogs.userId.invalid',
        },
      },
      entityPaymentGateways: {
        paymentGatewayId: {
          required: 'validation.models.entityPaymentGateways.paymentGatewayId.required',
          invalid: 'validation.models.entityPaymentGateways.paymentGatewayId.invalid',
        },
        condominiumId: {
          invalid: 'validation.models.entityPaymentGateways.condominiumId.invalid',
        },
        buildingId: {
          invalid: 'validation.models.entityPaymentGateways.buildingId.invalid',
        },
        registeredBy: {
          invalid: 'validation.models.entityPaymentGateways.registeredBy.invalid',
        },
      },
      exchangeRates: {
        fromCurrencyId: {
          required: 'validation.models.exchangeRates.fromCurrencyId.required',
          invalid: 'validation.models.exchangeRates.fromCurrencyId.invalid',
        },
        toCurrencyId: {
          required: 'validation.models.exchangeRates.toCurrencyId.required',
          invalid: 'validation.models.exchangeRates.toCurrencyId.invalid',
        },
        rate: {
          required: 'validation.models.exchangeRates.rate.required',
          invalid: 'validation.models.exchangeRates.rate.invalid',
        },
        effectiveDate: {
          required: 'validation.models.exchangeRates.effectiveDate.required',
          invalid: 'validation.models.exchangeRates.effectiveDate.invalid',
        },
        source: {
          max: 'validation.models.exchangeRates.source.max',
        },
        createdBy: {
          invalid: 'validation.models.exchangeRates.createdBy.invalid',
        },
      },
      expenseCategories: {
        name: {
          required: 'validation.models.expenseCategories.name.required',
          max: 'validation.models.expenseCategories.name.max',
        },
        parentCategoryId: {
          invalid: 'validation.models.expenseCategories.parentCategoryId.invalid',
        },
        registeredBy: {
          invalid: 'validation.models.expenseCategories.registeredBy.invalid',
        },
      },
      interestConfigurations: {
        name: {
          required: 'validation.models.interestConfigurations.name.required',
          max: 'validation.models.interestConfigurations.name.max',
        },
        condominiumId: {
          invalid: 'validation.models.interestConfigurations.condominiumId.invalid',
        },
        buildingId: {
          invalid: 'validation.models.interestConfigurations.buildingId.invalid',
        },
        paymentConceptId: {
          invalid: 'validation.models.interestConfigurations.paymentConceptId.invalid',
        },
        interestType: {
          required: 'validation.models.interestConfigurations.interestType.required',
          invalid: 'validation.models.interestConfigurations.interestType.invalid',
        },
        interestRate: {
          invalid: 'validation.models.interestConfigurations.interestRate.invalid',
        },
        fixedAmount: {
          invalid: 'validation.models.interestConfigurations.fixedAmount.invalid',
        },
        calculationPeriod: {
          invalid: 'validation.models.interestConfigurations.calculationPeriod.invalid',
        },
        gracePeriodDays: {
          invalid: 'validation.models.interestConfigurations.gracePeriodDays.invalid',
        },
        currencyId: {
          invalid: 'validation.models.interestConfigurations.currencyId.invalid',
        },
        effectiveFrom: {
          required: 'validation.models.interestConfigurations.effectiveFrom.required',
          invalid: 'validation.models.interestConfigurations.effectiveFrom.invalid',
        },
        effectiveTo: {
          invalid: 'validation.models.interestConfigurations.effectiveTo.invalid',
        },
        createdBy: {
          invalid: 'validation.models.interestConfigurations.createdBy.invalid',
        },
      },
      managementCompanies: {
        name: {
          required: 'validation.models.managementCompanies.name.required',
          max: 'validation.models.managementCompanies.name.max',
        },
        legalName: {
          max: 'validation.models.managementCompanies.legalName.max',
        },
        taxId: {
          max: 'validation.models.managementCompanies.taxId.max',
        },
        email: {
          invalid: 'validation.models.managementCompanies.email.invalid',
          max: 'validation.models.managementCompanies.email.max',
        },
        phone: {
          max: 'validation.models.managementCompanies.phone.max',
        },
        website: {
          invalid: 'validation.models.managementCompanies.website.invalid',
          max: 'validation.models.managementCompanies.website.max',
        },
        address: {
          max: 'validation.models.managementCompanies.address.max',
        },
        locationId: {
          invalid: 'validation.models.managementCompanies.locationId.invalid',
        },
        logoUrl: {
          invalid: 'validation.models.managementCompanies.logoUrl.invalid',
        },
        createdBy: {
          invalid: 'validation.models.managementCompanies.createdBy.invalid',
        },
      },
      paymentApplications: {
        paymentId: {
          required: 'validation.models.paymentApplications.paymentId.required',
          invalid: 'validation.models.paymentApplications.paymentId.invalid',
        },
        quotaId: {
          required: 'validation.models.paymentApplications.quotaId.required',
          invalid: 'validation.models.paymentApplications.quotaId.invalid',
        },
        appliedAmount: {
          required: 'validation.models.paymentApplications.appliedAmount.required',
          invalid: 'validation.models.paymentApplications.appliedAmount.invalid',
        },
        appliedToPrincipal: {
          invalid: 'validation.models.paymentApplications.appliedToPrincipal.invalid',
        },
        appliedToInterest: {
          invalid: 'validation.models.paymentApplications.appliedToInterest.invalid',
        },
        registeredBy: {
          invalid: 'validation.models.paymentApplications.registeredBy.invalid',
        },
      },
      paymentConcepts: {
        name: {
          required: 'validation.models.paymentConcepts.name.required',
          max: 'validation.models.paymentConcepts.name.max',
        },
        condominiumId: {
          invalid: 'validation.models.paymentConcepts.condominiumId.invalid',
        },
        buildingId: {
          invalid: 'validation.models.paymentConcepts.buildingId.invalid',
        },
        conceptType: {
          required: 'validation.models.paymentConcepts.conceptType.required',
          invalid: 'validation.models.paymentConcepts.conceptType.invalid',
        },
        recurrencePeriod: {
          invalid: 'validation.models.paymentConcepts.recurrencePeriod.invalid',
        },
        currencyId: {
          required: 'validation.models.paymentConcepts.currencyId.required',
          invalid: 'validation.models.paymentConcepts.currencyId.invalid',
        },
        createdBy: {
          invalid: 'validation.models.paymentConcepts.createdBy.invalid',
        },
      },
      paymentGateways: {
        name: {
          required: 'validation.models.paymentGateways.name.required',
          max: 'validation.models.paymentGateways.name.max',
        },
        gatewayType: {
          required: 'validation.models.paymentGateways.gatewayType.required',
          invalid: 'validation.models.paymentGateways.gatewayType.invalid',
        },
        registeredBy: {
          invalid: 'validation.models.paymentGateways.registeredBy.invalid',
        },
      },
      rolePermissions: {
        roleId: {
          required: 'validation.models.rolePermissions.roleId.required',
          invalid: 'validation.models.rolePermissions.roleId.invalid',
        },
        permissionId: {
          required: 'validation.models.rolePermissions.permissionId.required',
          invalid: 'validation.models.rolePermissions.permissionId.invalid',
        },
        registeredBy: {
          invalid: 'validation.models.rolePermissions.registeredBy.invalid',
        },
      },
      unitOwnerships: {
        unitId: {
          required: 'validation.models.unitOwnerships.unitId.required',
          invalid: 'validation.models.unitOwnerships.unitId.invalid',
        },
        userId: {
          required: 'validation.models.unitOwnerships.userId.required',
          invalid: 'validation.models.unitOwnerships.userId.invalid',
        },
        ownershipType: {
          required: 'validation.models.unitOwnerships.ownershipType.required',
          invalid: 'validation.models.unitOwnerships.ownershipType.invalid',
        },
        ownershipPercentage: {
          invalid: 'validation.models.unitOwnerships.ownershipPercentage.invalid',
        },
        titleDeedNumber: {
          max: 'validation.models.unitOwnerships.titleDeedNumber.max',
        },
        titleDeedDate: {
          invalid: 'validation.models.unitOwnerships.titleDeedDate.invalid',
        },
        startDate: {
          required: 'validation.models.unitOwnerships.startDate.required',
          invalid: 'validation.models.unitOwnerships.startDate.invalid',
        },
        endDate: {
          invalid: 'validation.models.unitOwnerships.endDate.invalid',
        },
      },
      userRoles: {
        userId: {
          required: 'validation.models.userRoles.userId.required',
          invalid: 'validation.models.userRoles.userId.invalid',
        },
        roleId: {
          required: 'validation.models.userRoles.roleId.required',
          invalid: 'validation.models.userRoles.roleId.invalid',
        },
        condominiumId: {
          invalid: 'validation.models.userRoles.condominiumId.invalid',
        },
        buildingId: {
          invalid: 'validation.models.userRoles.buildingId.invalid',
        },
        assignedBy: {
          invalid: 'validation.models.userRoles.assignedBy.invalid',
        },
        expiresAt: {
          invalid: 'validation.models.userRoles.expiresAt.invalid',
        },
        registeredBy: {
          invalid: 'validation.models.userRoles.registeredBy.invalid',
        },
      },
    },
  },
}
