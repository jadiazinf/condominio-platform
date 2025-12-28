import { serve } from 'bun'
import { Server } from '@http/server'
import { env } from '@config/environment'
import { DatabaseService } from '@database/service'

async function main() {
  DatabaseService.getInstance()

  const app = Server.getInstance().buildApp()

  serve({
    fetch: app.fetch,
    port: env.PORT,
  })
}

main().catch(error => {
  console.error('Error starting the server:', error)
})
