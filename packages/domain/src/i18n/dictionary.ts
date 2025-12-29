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
    },
  },
}
