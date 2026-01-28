import { serve } from 'bun'
import { Server } from '@http/server'
import { env } from '@config/environment'
import { DatabaseService } from '@database/service'
import { websocket, handleWebSocketUpgrade } from '@http/endpoints'

async function main() {
  DatabaseService.getInstance()

  const app = Server.getInstance().buildApp()

  // Create server - handle WebSocket upgrades BEFORE Hono to bypass middleware
  serve({
    fetch: (req, server) => {
      const url = new URL(req.url)

      // Handle WebSocket upgrade requests directly (bypass Hono middleware)
      if (url.pathname.startsWith('/api/ws/')) {
        const upgraded = handleWebSocketUpgrade(req, server, url)
        if (upgraded) {
          return undefined // Bun expects undefined for successful upgrades
        }
        return new Response('WebSocket upgrade failed', { status: 400 })
      }

      return app.fetch(req)
    },
    websocket,
    port: env.PORT,
  })

  console.log(`🚀 Server is running on http://${env.HOST}:${env.PORT}`)
  console.log(`🔌 WebSocket is available at ws://${env.HOST}:${env.PORT}/api/ws`)
}

main().catch(error => {
  console.error('Error starting the server:', error)
})
