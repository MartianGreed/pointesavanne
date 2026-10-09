import assert from "node:assert/strict"
import { SQL } from "bun"
import { join } from "node:path"

if (Bun.argv.includes("--database")) {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required")
  const sql = new SQL(process.env.DATABASE_URL)
  try {
    const [row] = await sql`SELECT to_regclass('es_events') AS events, to_regclass('auth_users') AS users`
    assert.ok(row.events, "event-store migrations must have run")
    assert.ok(row.users, "auth migrations must have run")
    console.log("PostgreSQL connection and application migrations passed")
  } finally {
    await sql.close()
  }
} else {
  const urls = JSON.parse(process.env.CONTREMAITRE_URLS ?? "{}") as Record<string, string>
  assert.ok(urls.api && urls.web, "Contremaitre API and web URLs are required")

  // Bun does not use the macOS keychain's trusted mkcert CA.
  const mkcert = Bun.spawnSync(["mkcert", "-CAROOT"])
  assert.equal(mkcert.exitCode, 0, "mkcert must be installed for local HTTPS checks")
  const ca = await Bun.file(join(mkcert.stdout.toString().trim(), "rootCA.pem")).text()

  const get = async (base: string, path: string) => {
    const response = await fetch(new URL(path, base), {
      tls: { ca },
      signal: AbortSignal.timeout(60_000),
    })
    assert.equal(response.status, 200, `${base}${path} must return 200`)
    return response
  }

  await get(urls.api, "/health/live")
  const spec = await (await get(urls.api, "/openapi.json")).json()
  assert.equal(spec.info.title, "Villa Pointe Savanne API")
  assert.ok(spec.paths["/bookings/quotation"])

  const page = await get(urls.web, "/")
  assert.match(page.headers.get("content-type") ?? "", /text\/html/)
  const html = await page.text()
  assert.match(html, /<app-root[\s>]/)
  assert.ok(html.includes("<title>Villa du Cassier Jaune"), "home page title must be server-rendered")

  await get(urls.web, "/health/live")
  const session = await (await get(urls.web, "/auth/session")).json()
  assert.equal(session.session, null, "anonymous session must pass through the Angular proxy")
  const availability = await (await get(urls.web,
    "/bookings/availability?villaId=villa-de-standing-pointe-savanne&from=2027-01-01&to=2027-01-08",
  )).json()
  assert.equal(typeof availability.available, "boolean")
  console.log("HTTPS page, API docs, auth proxy and PostgreSQL-backed availability passed")
}
