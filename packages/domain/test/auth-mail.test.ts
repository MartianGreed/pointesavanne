import { describe, expect, test } from "bun:test"
import type { AuthEmail } from "@structure-ai/auth"
import { Effect, Layer, Redacted } from "effect"
import { Mailer, mailerEmailSender, TENANT_ID, type OutgoingMail } from "../src/index.ts"

/**
 * The auth library hardcodes /auth/* link paths onto BASE_URL — the SPA's
 * origin. Those paths are not SPA routes (the dev-server proxy forwards
 * /auth/* to the API, which only serves POST), so the domain mailer must
 * rewrite them to the client's landing routes.
 */

const emailOf = (kind: AuthEmail["kind"], url: string): AuthEmail => ({
  kind,
  tenantId: TENANT_ID,
  to: "guest@example.com",
  url,
  token: Redacted.make("secret-token"),
  expiresAt: new Date("2026-09-01T05:32:21.572Z"),
})

const recordingMailer = (): { mails: OutgoingMail[]; layer: Layer.Layer<Mailer> } => {
  const mails: OutgoingMail[] = []
  return {
    mails,
    layer: Layer.succeed(
      Mailer,
      Mailer.of({ send: (mail) => Effect.sync(() => void mails.push(mail)) }),
    ),
  }
}

describe("auth e-mail links", () => {
  test("e-mail verification links land on the SPA verification route", async () => {
    const { mails, layer } = recordingMailer()
    const sender = await Effect.runPromise(Effect.provide(mailerEmailSender, layer))

    await Effect.runPromise(
      sender.send(emailOf("email-verification", "http://localhost:4200/auth/verify-email?token=abc")),
    )

    expect(mails[0]!.body).toContain("http://localhost:4200/verification?token=abc")
  })

  test("password-reset links land on the SPA reset route", async () => {
    const { mails, layer } = recordingMailer()
    const sender = await Effect.runPromise(Effect.provide(mailerEmailSender, layer))

    await Effect.runPromise(sender.send(emailOf("password-reset", "http://localhost:4200/auth/reset-password?token=xyz")))

    expect(mails[0]!.body).toContain("http://localhost:4200/mot-de-passe/reinitialiser?token=xyz")
  })

  test("links without an SPA landing route are sent untouched", async () => {
    const { mails, layer } = recordingMailer()
    const sender = await Effect.runPromise(Effect.provide(mailerEmailSender, layer))

    await Effect.runPromise(sender.send(emailOf("magic-link", "http://localhost:4200/auth/magic-link?token=ml")))

    expect(mails[0]!.body).toContain("http://localhost:4200/auth/magic-link?token=ml")
  })
})
