import { afterAll } from 'bun:test'
import { stopTestContainer } from './test-container'

// Silence console.error during tests to avoid confusion
// (errors are expected in many tests and don't indicate failures)
console.error = () => {}

// Global cleanup after all tests complete
afterAll(async () => {
  await stopTestContainer()
})

// Handle process termination
process.on('beforeExit', async () => {
  await stopTestContainer()
})
