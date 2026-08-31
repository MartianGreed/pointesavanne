import { describe, expect, test } from "bun:test"
import type { AuthEmail } from "@structure-ai/auth"
import { Redacted } from "effect"
import {
  authMail,
  formatEuros,
  quotationReadyMail,
  quotationRequestAdminMail,
  quotationRequestCustomerMail,
  quotationSignedAdminMail,
  renderMail,
  TENANT_ID,
  type QuotationDetails,
} from "../src/index.ts"

/**
 * Every transactional e-mail is declared once as blocks and rendered into two
 * parts: the designed HTML (Villa du Cassier Jaune) and the plain-text
 * fallback. These tests pin the contract both parts must honour — the design
 * tokens, escaping of customer-supplied text, and the fact that no reader
 * loses information by seeing only the text part.
 */

const details: QuotationDetails = {
  villaName: "Villa du Cassier Jaune",
  from: "2026-02-14",
  to: "2026-02-21",
  nights: 7,
  adultsCount: 4,
  childrenCount: 2,
  pricing: {
    totalAmount: 3040,
    unrankedTouristTax: 21,
    rankedTouristTax: 42,
    depositAmount: 1500,
    householdAmount: 180,
  },
}

const emailOf = (kind: AuthEmail["kind"]): AuthEmail => ({
  kind,
  tenantId: TENANT_ID,
  to: "guest@example.com",
  url: `http://localhost:4200/auth/${kind}?token=abc`,
  token: Redacted.make("secret-token"),
  expiresAt: new Date("2026-09-01T05:32:21.572Z"),
})

describe("the mail layout", () => {
  const mail = renderMail("guest@example.com", {
    subject: "Sujet",
    preheader: "Aperçu",
    kicker: "VILLA POINTE SAVANNE",
    title: "Un titre",
    blocks: [
      { _tag: "Paragraph", text: "Bonjour," },
      { _tag: "Button", label: "Ouvrir mon espace", url: "https://example.com/espace-client" },
      { _tag: "Summary", title: "Votre séjour", rows: [{ label: "Total", value: "3 040,00 €", emphasis: true }] },
    ],
  })

  test("renders both an HTML part and a plain-text fallback", () => {
    expect(mail.to).toBe("guest@example.com")
    expect(mail.subject).toBe("Sujet")
    expect(mail.html).toStartWith("<!doctype html>")
    expect(mail.body).not.toContain("<")
  })

  test("carries the design system's palette, brand and typography", () => {
    expect(mail.html).toContain("#143a2c") // deep green header and footer
    expect(mail.html).toContain("#fcfaf6") // page background
    expect(mail.html).toContain("#d9552e") // accent call to action
    expect(mail.html).toContain("VILLA DU CASSIER JAUNE")
    expect(mail.html).toContain("Cormorant Garamond")
    expect(mail.html).toContain("DM Sans")
  })

  test("stays deliverable: self-contained markup, no external assets or script", () => {
    expect(mail.html).not.toContain("<script")
    expect(mail.html).not.toContain("<img")
    expect(mail.html).not.toContain("stylesheet")
  })

  test("keeps the preheader out of the visible body but inside the HTML", () => {
    expect(mail.html).toContain("Aperçu")
    expect(mail.body).not.toContain("Aperçu")
  })

  test("never hides a link behind a button: the URL is in both parts", () => {
    expect(mail.html).toContain('href="https://example.com/espace-client"')
    expect(mail.body).toContain("https://example.com/espace-client")
    expect(mail.body).toContain("Ouvrir mon espace")
  })

  test("renders summary rows in both parts", () => {
    expect(mail.html).toContain("Total")
    expect(mail.html).toContain("3 040,00 €")
    expect(mail.body).toContain("Total : 3 040,00 €")
  })

  test("escapes customer-supplied text in the HTML part and leaves the text part raw", () => {
    const injected = renderMail("guest@example.com", {
      subject: "Sujet",
      preheader: "Aperçu",
      title: "Un titre",
      blocks: [{ _tag: "Quote", label: "Message", text: '<script>alert("x")</script> chiens & chats' }],
    })

    expect(injected.html).toContain("&lt;script&gt;")
    expect(injected.html).toContain("chiens &amp; chats")
    expect(injected.html).not.toContain("<script>alert")
    expect(injected.body).toContain('<script>alert("x")</script> chiens & chats')
  })
})

describe("the booking templates", () => {
  test("the quote request to the owner names the customer, the booking and the message", () => {
    const mail = renderMail(
      "admin@pointesavanne.test",
      quotationRequestAdminMail({
        bookingId: "booking-42",
        customerName: "Marie Dupont",
        customerEmail: "marie@example.com",
        details,
        message: "Nous arrivons avec un bébé",
      }),
    )

    expect(mail.subject).toContain("booking-42")
    expect(mail.body).toContain("Marie Dupont")
    expect(mail.body).toContain("marie@example.com")
    expect(mail.body).toContain("Nous arrivons avec un bébé")
    expect(mail.html).toContain("Nous arrivons avec un bébé")
  })

  test("the quote acknowledgement recaps the stay and its price for the customer", () => {
    const mail = renderMail("marie@example.com", quotationRequestCustomerMail({ firstname: "Marie", details }))

    expect(mail.subject).toContain("Villa du Cassier Jaune")
    expect(mail.body).toContain("Bonjour Marie")
    expect(mail.body).toContain("14/02/2026")
    expect(mail.body).toContain("21/02/2026")
    expect(mail.body).toContain("7 nuits")
    expect(mail.body).toContain(formatEuros(3040))
    expect(mail.body).toContain(formatEuros(1500)) // caution
  })

  test("the quote acknowledgement greets a customer whose firstname is unknown", () => {
    const mail = renderMail("marie@example.com", quotationRequestCustomerMail({ firstname: "", details }))

    expect(mail.body).toContain("Bonjour,")
    expect(mail.body).not.toContain("Bonjour ,")
  })

  test("the ready quotation points the customer at their area", () => {
    const mail = renderMail(
      "marie@example.com",
      quotationReadyMail({ firstname: "Marie", customerAreaUrl: "https://villa.example/espace-client" }),
    )

    expect(mail.html).toContain('href="https://villa.example/espace-client"')
    expect(mail.body).toContain("https://villa.example/espace-client")
    expect(mail.body).toContain("signer")
  })

  test("the signed quotation tells the owner which document landed", () => {
    const mail = renderMail(
      "admin@pointesavanne.test",
      quotationSignedAdminMail({ bookingId: "booking-42", fileName: "devis-signe.pdf" }),
    )

    expect(mail.subject).toContain("booking-42")
    expect(mail.body).toContain("devis-signe.pdf")
    expect(mail.html).toContain("devis-signe.pdf")
  })
})

describe("the auth templates", () => {
  test("each kind gets its own subject, title and call to action", () => {
    const verification = renderMail("guest@example.com", authMail(emailOf("email-verification"), "https://villa.example/verification?token=abc"))
    const reset = renderMail("guest@example.com", authMail(emailOf("password-reset"), "https://villa.example/mot-de-passe/reinitialiser?token=abc"))
    const magic = renderMail("guest@example.com", authMail(emailOf("magic-link"), "https://villa.example/auth/magic-link?token=abc"))

    expect(verification.subject).toContain("Vérifiez votre adresse e-mail")
    expect(reset.subject).toContain("Réinitialisation de votre mot de passe")
    expect(magic.subject).toContain("Votre lien de connexion")

    expect(verification.html).toContain('href="https://villa.example/verification?token=abc"')
    expect(reset.body).toContain("https://villa.example/mot-de-passe/reinitialiser?token=abc")
    expect(magic.body).toContain("https://villa.example/auth/magic-link?token=abc")
  })

  test("states the expiry in French, not as an ISO timestamp", () => {
    const mail = renderMail("guest@example.com", authMail(emailOf("password-reset"), "https://villa.example/x"))

    expect(mail.body).toContain("01/09/2026")
    expect(mail.body).not.toContain("2026-09-01T05:32:21.572Z")
  })
})
