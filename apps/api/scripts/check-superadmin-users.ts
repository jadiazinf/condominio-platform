#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users, userRoles, roles } from '../src/database/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

async function checkSuperadminUsers() {
  const queryClient = postgres(DATABASE_URL!)
  const db = drizzle(queryClient)

  try {
    console.log('Checking for users with SUPERADMIN role...\n')

    // Get SUPERADMIN role
    const superadminRoleResult = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'SUPERADMIN'))
      .limit(1)

    if (superadminRoleResult.length === 0) {
      console.log('❌ SUPERADMIN role does not exist')
      await queryClient.end()
      return
    }

    const superadminRole = superadminRoleResult[0]
    console.log('✅ SUPERADMIN role found:')
    console.log(`  ID: ${superadminRole.id}`)
    console.log(`  Name: ${superadminRole.name}`)
    console.log('')

    // Get all users with SUPERADMIN role (global scope only)
    const superadminUsersResult = await db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        isActive: users.isActive,
        userRoleId: userRoles.id,
        userRoleIsActive: userRoles.isActive,
        condominiumId: userRoles.condominiumId,
        buildingId: userRoles.buildingId,
      })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(
        and(
          eq(userRoles.roleId, superadminRole.id),
          isNull(userRoles.condominiumId),
          isNull(userRoles.buildingId)
        )
      )

    if (superadminUsersResult.length === 0) {
      console.log('❌ No users with SUPERADMIN role found\n')
      console.log('All users in database:')

      const allUsers = await db.select().from(users).limit(10)

      allUsers.forEach((user) => {
        console.log(`\n  ID: ${user.id}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Display Name: ${user.displayName}`)
        console.log(`  Is Active: ${user.isActive}`)
      })
    } else {
      console.log('✅ Found SUPERADMIN users:\n')
      superadminUsersResult.forEach((user) => {
        console.log(`  User ID: ${user.userId}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Display Name: ${user.displayName}`)
        console.log(`  User Active: ${user.isActive}`)
        console.log(`  Role Active: ${user.userRoleIsActive}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await queryClient.end()
  }
}

checkSuperadminUsers()
