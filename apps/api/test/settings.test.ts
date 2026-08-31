import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect } from "effect"
import { dotEnvCandidates, dotenvOverrides } from "../src/settings.ts"

/**
 * Dotenv layering, matching Bun's file convention: `.env.local` overrides
 * `.env` per key, the working directory beats the workspace root, and real
 * environment variables beat every file.
 */

const runOverrides = (paths: ReadonlyArray<string>, env: Record<string, string | undefined> = {}) =>
  Effect.runSync(dotenvOverrides(paths, env))

/** A tree with a workspace root (bun.lock marker) and a nested package. */
const makeTree = (): { readonly root: string; readonly pkg: string; readonly from: string } => {
  const root = mkdtempSync(join(tmpdir(), "pointesavanne-env-"))
  const pkg = join(root, "apps", "api")
  mkdirSync(join(pkg, "src"), { recursive: true })
  writeFileSync(join(root, "bun.lock"), "")
  writeFileSync(join(pkg, "src", "settings.ts"), "")
  return { root, pkg, from: join(pkg, "src", "settings.ts") }
}

const write = (path: string, content: string): string => {
  writeFileSync(path, content)
  return path
}

describe("dotEnvCandidates", () => {
  test("lists .env.local and .env at the cwd before the workspace root's pair", () => {
    const { root, pkg, from } = makeTree()
    expect(dotEnvCandidates(pkg, from)).toEqual([
      join(pkg, ".env.local"),
      join(pkg, ".env"),
      join(root, ".env.local"),
      join(root, ".env"),
    ])
  })

  test("does not duplicate the root pair when the cwd is the workspace root", () => {
    const { root, from } = makeTree()
    expect(dotEnvCandidates(root, from)).toEqual([join(root, ".env.local"), join(root, ".env")])
  })
})

describe("dotenvOverrides", () => {
  test("merges per key: .env.local overrides .env, other keys survive", () => {
    const { root, pkg } = makeTree()
    write(join(root, ".env"), "OWNER_EMAILS=root-owner@example.com\nADMIN_MAIL=root-admin@example.com\nDATABASE_URL=postgres://root\n")
    write(join(root, ".env.local"), "OWNER_EMAILS=root-local@example.com\n")
    const overrides = runOverrides([join(pkg, ".env.local"), join(pkg, ".env"), join(root, ".env.local"), join(root, ".env")])
    expect(overrides).toEqual({
      OWNER_EMAILS: "root-local@example.com",
      ADMIN_MAIL: "root-admin@example.com",
      DATABASE_URL: "postgres://root",
    })
  })

  test("the working directory's files override the workspace root's", () => {
    const { root, pkg } = makeTree()
    write(join(root, ".env"), "ADMIN_MAIL=root-admin@example.com\n")
    write(join(pkg, ".env.local"), "ADMIN_MAIL=pkg-local@example.com\n")
    const overrides = runOverrides([join(pkg, ".env.local"), join(pkg, ".env"), join(root, ".env.local"), join(root, ".env")])
    expect(overrides).toEqual({ ADMIN_MAIL: "pkg-local@example.com" })
  })

  test("drops keys already set in the environment", () => {
    const { root } = makeTree()
    write(join(root, ".env"), "OWNER_EMAILS=file@example.com\nADMIN_MAIL=file@example.com\n")
    const overrides = runOverrides([join(root, ".env.local"), join(root, ".env")], {
      OWNER_EMAILS: "environment@example.com",
    })
    expect(overrides).toEqual({ ADMIN_MAIL: "file@example.com" })
  })

  test("returns nothing when no candidate exists", () => {
    const { root } = makeTree()
    expect(runOverrides([join(root, ".env.local"), join(root, ".env")])).toEqual({})
  })
})
