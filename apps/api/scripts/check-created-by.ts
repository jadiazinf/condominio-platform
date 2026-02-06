#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { managementCompanies, users } from '../src/database/drizzle/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

async function checkData() {
  const queryClient = postgres(DATABASE_URL!)
  const db = drizzle(queryClient)

  try {
    console.log('Checking management companies created_by data...\n')

    const companies = await db
      .select({
        id: managementCompanies.id,
        name: managementCompanies.name,
        createdBy: managementCompanies.createdBy,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(managementCompanies)
      .leftJoin(users, eq(managementCompanies.createdBy, users.id))
      .limit(5)

    companies.forEach((company) => {
      console.log(`Company: ${company.name}`)
      console.log(`  Created By ID: ${company.createdBy}`)
      console.log(`  User Name: ${company.userName || 'NULL'}`)
      console.log(`  User Email: ${company.userEmail || 'NULL'}`)
      console.log('')
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await queryClient.end()
  }
}

checkData()
