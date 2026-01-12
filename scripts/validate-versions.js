#!/usr/bin/env node

/**
 * Script para validar que las versiones críticas sean consistentes
 * en todo el monorepo
 */

const fs = require('fs')
const path = require('path')

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

const CRITICAL_PACKAGES = ['react', 'react-dom', '@types/react', '@types/react-dom', 'typescript']

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function readPackageJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    return null
  }
}

function getVersion(pkg, packageName) {
  return pkg?.dependencies?.[packageName] || pkg?.devDependencies?.[packageName] || null
}

function normalizeVersion(version) {
  if (!version) return null
  // Remove ^, ~, >= etc
  return version.replace(/^[\^~>=<]+/, '')
}

function validateVersions() {
  log('\n🔍 Validando versiones del monorepo...\n', 'blue')

  const rootPkg = readPackageJson('./package.json')
  const workspaces = ['apps/web', 'apps/mobile', 'apps/api']

  let hasErrors = false
  const versionMap = new Map()

  // Recopilar versiones
  CRITICAL_PACKAGES.forEach((pkgName) => {
    const versions = new Map()

    // Root version
    const rootVersion = getVersion(rootPkg, pkgName)
    if (rootVersion) {
      versions.set('root', normalizeVersion(rootVersion))
    }

    // Workspace versions
    workspaces.forEach((workspace) => {
      const pkgPath = path.join(workspace, 'package.json')
      const pkg = readPackageJson(pkgPath)
      if (pkg) {
        const version = getVersion(pkg, pkgName)
        if (version) {
          versions.set(workspace, normalizeVersion(version))
        }
      }
    })

    versionMap.set(pkgName, versions)
  })

  // Validar consistencia
  CRITICAL_PACKAGES.forEach((pkgName) => {
    const versions = versionMap.get(pkgName)
    if (!versions || versions.size === 0) {
      log(`⚠️  ${pkgName}: No encontrado`, 'yellow')
      return
    }

    const uniqueVersions = new Set(versions.values())

    if (uniqueVersions.size > 1) {
      hasErrors = true
      log(`❌ ${pkgName}: VERSIONES INCONSISTENTES`, 'red')
      versions.forEach((version, location) => {
        log(`   ${location}: ${version}`, 'red')
      })
      log('')
    } else {
      const version = Array.from(uniqueVersions)[0]
      log(`✅ ${pkgName}: ${version}`, 'green')
    }
  })

  // Validar que no haya carets/tildes en versiones críticas
  log('\n🔒 Validando versiones fijas...\n', 'blue')

  CRITICAL_PACKAGES.forEach((pkgName) => {
    const versions = versionMap.get(pkgName)
    if (!versions) return

    versions.forEach((_, location) => {
      const pkgPath = location === 'root' ? './package.json' : `${location}/package.json`
      const pkg = readPackageJson(pkgPath)
      const rawVersion = getVersion(pkg, pkgName)

      if (rawVersion && /^[\^~]/.test(rawVersion)) {
        hasErrors = true
        log(`❌ ${location}/${pkgName}: ${rawVersion} - Debe ser versión fija (sin ^ o ~)`, 'red')
      }
    })
  })

  log('\n' + '='.repeat(60) + '\n')

  if (hasErrors) {
    log('❌ VALIDACIÓN FALLIDA - Hay inconsistencias en las versiones', 'red')
    log('\n💡 Para solucionar:', 'yellow')
    log('   1. Revisa VERSIONING.md', 'yellow')
    log('   2. Actualiza las versiones inconsistentes', 'yellow')
    log('   3. Ejecuta: rm -rf node_modules apps/*/node_modules bun.lock && bun install\n', 'yellow')
    process.exit(1)
  } else {
    log('✅ VALIDACIÓN EXITOSA - Todas las versiones son consistentes\n', 'green')
    process.exit(0)
  }
}

validateVersions()
