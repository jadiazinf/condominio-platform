import { serve } from 'bun'
import { Server } from '@http/server'
import { env } from '@config/environment'
import { DatabaseService } from '@database/service'
import { websocket } from '@http/endpoints'

async function main() {
  DatabaseService.getInstance()

  const app = Server.getInstance().buildApp()

  serve({
    fetch: app.fetch,
    websocket,
    port: env.PORT,
  })
  console.log(`🚀 Server is running on http://${env.HOST}:${env.PORT}`)
  console.log(`🔌 WebSocket is available at ws://${env.HOST}:${env.PORT}/api/ws`)
}

main().catch(error => {
  console.error('Error starting the server:', error)
})
