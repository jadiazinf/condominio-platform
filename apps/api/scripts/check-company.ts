#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { managementCompanies } from '../src/database/drizzle/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

async function checkCompany() {
  const queryClient = postgres(DATABASE_URL!)
  const db = drizzle(queryClient)

  try {
    const companyId = '64d884f5-cc2d-44fb-b6aa-3d2b031e52d8'

    console.log(`Checking company ${companyId}...\n`)

    const company = await db
      .select()
      .from(managementCompanies)
      .where(eq(managementCompanies.id, companyId))
      .limit(1)

    if (company.length === 0) {
      console.log('❌ Company NOT FOUND in database')
    } else {
      console.log('✅ Company FOUND:')
      console.log(JSON.stringify(company[0], null, 2))
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await queryClient.end()
  }
}

checkCompany()
