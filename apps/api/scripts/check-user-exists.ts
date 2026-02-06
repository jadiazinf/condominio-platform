#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users } from '../src/database/drizzle/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

async function checkUser() {
  const queryClient = postgres(DATABASE_URL!)
  const db = drizzle(queryClient)

  try {
    const userId = '2880cba6-e991-4bd4-8fc1-f604b31b8b96'

    console.log(`Checking if user ${userId} exists...\n`)

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (user.length > 0) {
      console.log('✅ User FOUND:')
      console.log(JSON.stringify(user[0], null, 2))
    } else {
      console.log('❌ User NOT FOUND')
      console.log('\nLooking for any superadmin users...\n')

      const superadmins = await db
        .select()
        .from(users)
        .where(eq(users.isSuperadmin, true))
        .limit(5)

      if (superadmins.length > 0) {
        console.log('Found superadmin users:')
        superadmins.forEach((sa) => {
          console.log(`\nID: ${sa.id}`)
          console.log(`Email: ${sa.email}`)
          console.log(`Display Name: ${sa.displayName}`)
          console.log(`Is Superadmin: ${sa.isSuperadmin}`)
        })
      } else {
        console.log('No superadmin users found')
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await queryClient.end()
  }
}

checkUser()
