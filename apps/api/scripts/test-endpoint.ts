#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { ManagementCompaniesRepository, UsersRepository, LocationsRepository } from '../src/database/repositories'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

async function testEndpoint() {
  const queryClient = postgres(DATABASE_URL!)
  const db = drizzle(queryClient)

  const companiesRepo = new ManagementCompaniesRepository(db)
  const usersRepo = new UsersRepository(db)
  const locationsRepo = new LocationsRepository(db)

  try {
    // Get Grupo Taras (the one visible in screenshot)
    const companies = await companiesRepo.getAll()
    const grupoTaras = companies.find(c => c.name === 'Grupo Taras')

    if (!grupoTaras) {
      console.log('Grupo Taras not found')
      return
    }

    console.log('Company:', grupoTaras.name)
    console.log('Created By ID:', grupoTaras.createdBy)

    if (grupoTaras.createdBy) {
      const createdByUser = await usersRepo.getById(grupoTaras.createdBy)
      console.log('Created By User:', createdByUser)

      if (createdByUser) {
        const isSuperadmin = await usersRepo.checkIsSuperadmin(createdByUser.id)
        console.log('Is Superadmin:', isSuperadmin)
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await queryClient.end()
  }
}

testEndpoint()
