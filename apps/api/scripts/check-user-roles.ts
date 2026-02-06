#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users, userRoles, roles } from '../src/database/drizzle/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

async function checkUserRoles() {
  const queryClient = postgres(DATABASE_URL!)
  const db = drizzle(queryClient)

  try {
    const userId = '2880cba6-e991-4bd4-8fc1-f604b31b8b96'

    console.log(`Checking roles for user ${userId}...\n`)

    // Get user info
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userResult.length === 0) {
      console.log('❌ User not found')
      await queryClient.end()
      return
    }

    const user = userResult[0]
    console.log('User:', user.email, '-', user.displayName)
    console.log('')

    // Get user roles
    const userRolesResult = await db
      .select({
        userRoleId: userRoles.id,
        roleId: roles.id,
        roleName: roles.name,
        condominiumId: userRoles.condominiumId,
        buildingId: userRoles.buildingId,
        isActive: userRoles.isActive,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))

    if (userRolesResult.length === 0) {
      console.log('❌ No roles assigned to this user')
      console.log('\nLooking for SUPERADMIN role...\n')

      const superadminRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, 'SUPERADMIN'))
        .limit(1)

      if (superadminRole.length > 0) {
        console.log('✅ SUPERADMIN role exists:')
        console.log(JSON.stringify(superadminRole[0], null, 2))
      } else {
        console.log('❌ SUPERADMIN role does not exist in database')
      }
    } else {
      console.log('✅ User has the following roles:\n')
      userRolesResult.forEach((role) => {
        console.log(`  Role: ${role.roleName}`)
        console.log(`  Role ID: ${role.roleId}`)
        console.log(`  Condominium ID: ${role.condominiumId || 'null (global)'}`)
        console.log(`  Building ID: ${role.buildingId || 'null'}`)
        console.log(`  Is Active: ${role.isActive}`)
        console.log('')
      })

      const hasSuperadmin = userRolesResult.some(
        (role) => role.roleName === 'SUPERADMIN' && !role.condominiumId && !role.buildingId
      )

      if (hasSuperadmin) {
        console.log('✅ User IS a SUPERADMIN')
      } else {
        console.log('❌ User is NOT a SUPERADMIN')
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await queryClient.end()
  }
}

checkUserRoles()
