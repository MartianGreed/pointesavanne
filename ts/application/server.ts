import { createHomeRoute } from './routes/home-route.ts'

export function startServer(port: number = 3000) {
  const server = Bun.serve({
    port,
    routes: {
      '/': createHomeRoute(),
      '/api/health': {
        GET: () => Response.json({ status: 'ok' }),
      },
    },
    development: {
      hmr: true,
      console: true,
    },
  })

  console.log(`Server running at http://localhost:${server.port}`)

  return server
}
