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
      auth: {
        email: {
          required: 'validation.models.auth.email.required',
          invalid: 'validation.models.auth.email.invalid',
        },
        password: {
          required: 'validation.models.auth.password.required',
          min: 'validation.models.auth.password.min',
        },
        firstName: {
          required: 'validation.models.auth.firstName.required',
        },
        lastName: {
          required: 'validation.models.auth.lastName.required',
        },
        confirmPassword: {
          mismatch: 'validation.models.auth.confirmPassword.mismatch',
        },
        acceptTerms: {
          required: 'validation.models.auth.acceptTerms.required',
        },
      },
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
        phoneCountryCode: {
          required: 'validation.models.users.phoneCountryCode.required',
          max: 'validation.models.users.phoneCountryCode.max',
        },
        phoneNumber: {
          required: 'validation.models.users.phoneNumber.required',
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
        managementCompanyIds: {
          required: 'validation.models.condominiums.managementCompanyIds.required',
          invalid: 'validation.models.condominiums.managementCompanyIds.invalid',
          minLength: 'validation.models.condominiums.managementCompanyIds.minLength',
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
        phoneCountryCode: {
          max: 'validation.models.condominiums.phoneCountryCode.max',
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
          required: 'validation.models.managementCompanies.legalName.required',
          max: 'validation.models.managementCompanies.legalName.max',
        },
        taxIdType: {
          required: 'validation.models.managementCompanies.taxIdType.required',
          invalid: 'validation.models.managementCompanies.taxIdType.invalid',
        },
        taxIdNumber: {
          required: 'validation.models.managementCompanies.taxIdNumber.required',
          max: 'validation.models.managementCompanies.taxIdNumber.max',
        },
        email: {
          required: 'validation.models.managementCompanies.email.required',
          invalid: 'validation.models.managementCompanies.email.invalid',
          max: 'validation.models.managementCompanies.email.max',
        },
        phoneCountryCode: {
          required: 'validation.models.managementCompanies.phoneCountryCode.required',
          max: 'validation.models.managementCompanies.phoneCountryCode.max',
        },
        phone: {
          required: 'validation.models.managementCompanies.phone.required',
          max: 'validation.models.managementCompanies.phone.max',
        },
        website: {
          invalid: 'validation.models.managementCompanies.website.invalid',
          max: 'validation.models.managementCompanies.website.max',
        },
        address: {
          required: 'validation.models.managementCompanies.address.required',
          max: 'validation.models.managementCompanies.address.max',
        },
        locationId: {
          required: 'validation.models.managementCompanies.locationId.required',
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
      userPermissions: {
        userId: {
          required: 'validation.models.userPermissions.userId.required',
          invalid: 'validation.models.userPermissions.userId.invalid',
        },
        permissionId: {
          required: 'validation.models.userPermissions.permissionId.required',
          invalid: 'validation.models.userPermissions.permissionId.invalid',
        },
        isEnabled: {
          invalid: 'validation.models.userPermissions.isEnabled.invalid',
        },
        assignedBy: {
          invalid: 'validation.models.userPermissions.assignedBy.invalid',
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
      quotaAdjustments: {
        quotaId: {
          required: 'validation.models.quotaAdjustments.quotaId.required',
          invalid: 'validation.models.quotaAdjustments.quotaId.invalid',
        },
        previousAmount: {
          required: 'validation.models.quotaAdjustments.previousAmount.required',
          invalid: 'validation.models.quotaAdjustments.previousAmount.invalid',
        },
        newAmount: {
          required: 'validation.models.quotaAdjustments.newAmount.required',
          invalid: 'validation.models.quotaAdjustments.newAmount.invalid',
        },
        adjustmentType: {
          required: 'validation.models.quotaAdjustments.adjustmentType.required',
          invalid: 'validation.models.quotaAdjustments.adjustmentType.invalid',
        },
        reason: {
          required: 'validation.models.quotaAdjustments.reason.required',
          min: 'validation.models.quotaAdjustments.reason.min',
        },
        createdBy: {
          required: 'validation.models.quotaAdjustments.createdBy.required',
          invalid: 'validation.models.quotaAdjustments.createdBy.invalid',
        },
      },
      quotaFormulas: {
        condominiumId: {
          required: 'validation.models.quotaFormulas.condominiumId.required',
          invalid: 'validation.models.quotaFormulas.condominiumId.invalid',
        },
        name: {
          required: 'validation.models.quotaFormulas.name.required',
          max: 'validation.models.quotaFormulas.name.max',
        },
        formulaType: {
          required: 'validation.models.quotaFormulas.formulaType.required',
          invalid: 'validation.models.quotaFormulas.formulaType.invalid',
        },
        fixedAmount: {
          invalid: 'validation.models.quotaFormulas.fixedAmount.invalid',
        },
        expression: {
          invalid: 'validation.models.quotaFormulas.expression.invalid',
        },
        currencyId: {
          required: 'validation.models.quotaFormulas.currencyId.required',
          invalid: 'validation.models.quotaFormulas.currencyId.invalid',
        },
        createdBy: {
          required: 'validation.models.quotaFormulas.createdBy.required',
          invalid: 'validation.models.quotaFormulas.createdBy.invalid',
        },
        updatedBy: {
          invalid: 'validation.models.quotaFormulas.updatedBy.invalid',
        },
      },
      quotaGenerationRules: {
        condominiumId: {
          required: 'validation.models.quotaGenerationRules.condominiumId.required',
          invalid: 'validation.models.quotaGenerationRules.condominiumId.invalid',
        },
        buildingId: {
          invalid: 'validation.models.quotaGenerationRules.buildingId.invalid',
        },
        paymentConceptId: {
          required: 'validation.models.quotaGenerationRules.paymentConceptId.required',
          invalid: 'validation.models.quotaGenerationRules.paymentConceptId.invalid',
        },
        quotaFormulaId: {
          required: 'validation.models.quotaGenerationRules.quotaFormulaId.required',
          invalid: 'validation.models.quotaGenerationRules.quotaFormulaId.invalid',
        },
        name: {
          required: 'validation.models.quotaGenerationRules.name.required',
          max: 'validation.models.quotaGenerationRules.name.max',
        },
        effectiveFrom: {
          required: 'validation.models.quotaGenerationRules.effectiveFrom.required',
          invalid: 'validation.models.quotaGenerationRules.effectiveFrom.invalid',
        },
        effectiveTo: {
          invalid: 'validation.models.quotaGenerationRules.effectiveTo.invalid',
        },
        createdBy: {
          required: 'validation.models.quotaGenerationRules.createdBy.required',
          invalid: 'validation.models.quotaGenerationRules.createdBy.invalid',
        },
        updatedBy: {
          invalid: 'validation.models.quotaGenerationRules.updatedBy.invalid',
        },
      },
      quotaGenerationSchedules: {
        quotaGenerationRuleId: {
          required: 'validation.models.quotaGenerationSchedules.quotaGenerationRuleId.required',
          invalid: 'validation.models.quotaGenerationSchedules.quotaGenerationRuleId.invalid',
        },
        name: {
          required: 'validation.models.quotaGenerationSchedules.name.required',
          max: 'validation.models.quotaGenerationSchedules.name.max',
        },
        frequencyType: {
          required: 'validation.models.quotaGenerationSchedules.frequencyType.required',
          invalid: 'validation.models.quotaGenerationSchedules.frequencyType.invalid',
        },
        frequencyValue: {
          invalid: 'validation.models.quotaGenerationSchedules.frequencyValue.invalid',
          min: 'validation.models.quotaGenerationSchedules.frequencyValue.min',
        },
        generationDay: {
          required: 'validation.models.quotaGenerationSchedules.generationDay.required',
          min: 'validation.models.quotaGenerationSchedules.generationDay.min',
          max: 'validation.models.quotaGenerationSchedules.generationDay.max',
        },
        periodsInAdvance: {
          min: 'validation.models.quotaGenerationSchedules.periodsInAdvance.min',
        },
        issueDay: {
          required: 'validation.models.quotaGenerationSchedules.issueDay.required',
          min: 'validation.models.quotaGenerationSchedules.issueDay.min',
          max: 'validation.models.quotaGenerationSchedules.issueDay.max',
        },
        dueDay: {
          required: 'validation.models.quotaGenerationSchedules.dueDay.required',
          min: 'validation.models.quotaGenerationSchedules.dueDay.min',
          max: 'validation.models.quotaGenerationSchedules.dueDay.max',
        },
        graceDays: {
          min: 'validation.models.quotaGenerationSchedules.graceDays.min',
        },
        createdBy: {
          required: 'validation.models.quotaGenerationSchedules.createdBy.required',
          invalid: 'validation.models.quotaGenerationSchedules.createdBy.invalid',
        },
        updatedBy: {
          invalid: 'validation.models.quotaGenerationSchedules.updatedBy.invalid',
        },
      },
      quotaGenerationLogs: {
        generationRuleId: {
          invalid: 'validation.models.quotaGenerationLogs.generationRuleId.invalid',
        },
        generationScheduleId: {
          invalid: 'validation.models.quotaGenerationLogs.generationScheduleId.invalid',
        },
        quotaFormulaId: {
          invalid: 'validation.models.quotaGenerationLogs.quotaFormulaId.invalid',
        },
        generationMethod: {
          required: 'validation.models.quotaGenerationLogs.generationMethod.required',
          invalid: 'validation.models.quotaGenerationLogs.generationMethod.invalid',
        },
        periodYear: {
          required: 'validation.models.quotaGenerationLogs.periodYear.required',
          invalid: 'validation.models.quotaGenerationLogs.periodYear.invalid',
        },
        periodMonth: {
          min: 'validation.models.quotaGenerationLogs.periodMonth.min',
          max: 'validation.models.quotaGenerationLogs.periodMonth.max',
        },
        status: {
          required: 'validation.models.quotaGenerationLogs.status.required',
          invalid: 'validation.models.quotaGenerationLogs.status.invalid',
        },
        generatedBy: {
          required: 'validation.models.quotaGenerationLogs.generatedBy.required',
          invalid: 'validation.models.quotaGenerationLogs.generatedBy.invalid',
        },
      },
      paymentPendingAllocations: {
        paymentId: {
          required: 'validation.models.paymentPendingAllocations.paymentId.required',
          invalid: 'validation.models.paymentPendingAllocations.paymentId.invalid',
        },
        pendingAmount: {
          required: 'validation.models.paymentPendingAllocations.pendingAmount.required',
          invalid: 'validation.models.paymentPendingAllocations.pendingAmount.invalid',
        },
        currencyId: {
          required: 'validation.models.paymentPendingAllocations.currencyId.required',
          invalid: 'validation.models.paymentPendingAllocations.currencyId.invalid',
        },
        status: {
          required: 'validation.models.paymentPendingAllocations.status.required',
          invalid: 'validation.models.paymentPendingAllocations.status.invalid',
        },
        resolutionType: {
          max: 'validation.models.paymentPendingAllocations.resolutionType.max',
        },
        allocatedToQuotaId: {
          invalid: 'validation.models.paymentPendingAllocations.allocatedToQuotaId.invalid',
        },
        allocatedBy: {
          invalid: 'validation.models.paymentPendingAllocations.allocatedBy.invalid',
        },
      },
      notificationTemplates: {
        code: {
          required: 'validation.models.notificationTemplates.code.required',
          min: 'validation.models.notificationTemplates.code.min',
          max: 'validation.models.notificationTemplates.code.max',
        },
        name: {
          required: 'validation.models.notificationTemplates.name.required',
          min: 'validation.models.notificationTemplates.name.min',
          max: 'validation.models.notificationTemplates.name.max',
        },
        category: {
          required: 'validation.models.notificationTemplates.category.required',
          invalid: 'validation.models.notificationTemplates.category.invalid',
        },
        subjectTemplate: {
          max: 'validation.models.notificationTemplates.subjectTemplate.max',
        },
        bodyTemplate: {
          required: 'validation.models.notificationTemplates.bodyTemplate.required',
        },
        defaultChannels: {
          invalid: 'validation.models.notificationTemplates.defaultChannels.invalid',
        },
        createdBy: {
          invalid: 'validation.models.notificationTemplates.createdBy.invalid',
        },
      },
      notifications: {
        userId: {
          required: 'validation.models.notifications.userId.required',
          invalid: 'validation.models.notifications.userId.invalid',
        },
        templateId: {
          invalid: 'validation.models.notifications.templateId.invalid',
        },
        category: {
          required: 'validation.models.notifications.category.required',
          invalid: 'validation.models.notifications.category.invalid',
        },
        title: {
          required: 'validation.models.notifications.title.required',
          min: 'validation.models.notifications.title.min',
          max: 'validation.models.notifications.title.max',
        },
        body: {
          required: 'validation.models.notifications.body.required',
        },
        priority: {
          invalid: 'validation.models.notifications.priority.invalid',
        },
        readAt: {
          invalid: 'validation.models.notifications.readAt.invalid',
        },
        expiresAt: {
          invalid: 'validation.models.notifications.expiresAt.invalid',
        },
      },
      notificationDeliveries: {
        notificationId: {
          required: 'validation.models.notificationDeliveries.notificationId.required',
          invalid: 'validation.models.notificationDeliveries.notificationId.invalid',
        },
        channel: {
          required: 'validation.models.notificationDeliveries.channel.required',
          invalid: 'validation.models.notificationDeliveries.channel.invalid',
        },
        status: {
          invalid: 'validation.models.notificationDeliveries.status.invalid',
        },
        sentAt: {
          invalid: 'validation.models.notificationDeliveries.sentAt.invalid',
        },
        deliveredAt: {
          invalid: 'validation.models.notificationDeliveries.deliveredAt.invalid',
        },
        failedAt: {
          invalid: 'validation.models.notificationDeliveries.failedAt.invalid',
        },
        externalId: {
          max: 'validation.models.notificationDeliveries.externalId.max',
        },
      },
      userNotificationPreferences: {
        userId: {
          required: 'validation.models.userNotificationPreferences.userId.required',
          invalid: 'validation.models.userNotificationPreferences.userId.invalid',
        },
        category: {
          required: 'validation.models.userNotificationPreferences.category.required',
          invalid: 'validation.models.userNotificationPreferences.category.invalid',
        },
        channel: {
          required: 'validation.models.userNotificationPreferences.channel.required',
          invalid: 'validation.models.userNotificationPreferences.channel.invalid',
        },
        quietHoursStart: {
          invalid: 'validation.models.userNotificationPreferences.quietHoursStart.invalid',
        },
        quietHoursEnd: {
          invalid: 'validation.models.userNotificationPreferences.quietHoursEnd.invalid',
        },
      },
      userFcmTokens: {
        userId: {
          required: 'validation.models.userFcmTokens.userId.required',
          invalid: 'validation.models.userFcmTokens.userId.invalid',
        },
        token: {
          required: 'validation.models.userFcmTokens.token.required',
          max: 'validation.models.userFcmTokens.token.max',
        },
        platform: {
          required: 'validation.models.userFcmTokens.platform.required',
          invalid: 'validation.models.userFcmTokens.platform.invalid',
        },
        deviceName: {
          max: 'validation.models.userFcmTokens.deviceName.max',
        },
      },
    },
  },
}
