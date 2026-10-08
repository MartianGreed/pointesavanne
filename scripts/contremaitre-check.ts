import assert from "node:assert/strict"
import { SQL } from "bun"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required")
const sql = new SQL(process.env.DATABASE_URL)
const database = `checks_${crypto.randomUUID().replaceAll("-", "")}`
const files = await mkdtemp(join(tmpdir(), "pointesavanne-checks-"))
const url = new URL(process.env.DATABASE_URL)
url.pathname = `/${database}`

try {
  await sql.unsafe(`CREATE DATABASE ${database}`)
  for (const script of ["typecheck", "test", "test:features", "build"]) {
    console.log(`Running ${script}`)
    const check = Bun.spawn(["bun", "run", script, "--concurrency=1", "--continue=always"], {
      env: { ...process.env, DATABASE_URL: url.href, FILES_DIR: files },
      stdout: "inherit",
      stderr: "inherit",
    })
    const code = await check.exited
    if (code !== 0) process.exitCode = code
    console.log(`${script}: ${code === 0 ? "passed" : "failed"}`)
  }
} finally {
  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`)
    console.log("Temporary verification database removed")
  } finally {
    await sql.close()
    await rm(files, { recursive: true, force: true })
  }
}
