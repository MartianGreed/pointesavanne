/**
 * The transactional e-mail layout — the Villa du Cassier Jaune design system
 * (apps/client/src/styles.css) expressed in the subset of HTML that mail
 * clients render: one 600px table stack, every style inline, no external
 * asset, no script.
 *
 * An e-mail is declared once as a list of blocks and rendered twice: into the
 * designed HTML part and into the plain-text fallback. Both parts come out of
 * the same declaration, so a text-only reader never loses a link or an
 * amount, and a new template cannot forget one of the two.
 */

import type { OutgoingMail } from "../infra.ts"

// ---------------------------------------------------------------------------
// Design tokens — mirrored from the client stylesheet's :root. Mail clients
// support neither custom properties nor stylesheets, so the values live here
// as constants and are interpolated inline.
// ---------------------------------------------------------------------------

export const mailTheme = {
  bg: "#fcfaf6",
  ink: "#3e4f47",
  inkStrong: "#23413a",
  title: "#1c3b31",
  label: "#55665e",
  muted: "#6a7a71",
  muted2: "#8b9a92",
  line: "#e8e4da",
  lineSoft: "#f0ede5",
  accent: "#d9552e",
  greenDeep: "#143a2c",
  cream: "#f5efe5",
  okBg: "#eaf0ea",
  okInk: "#1e4436",
  errBg: "#fbede7",
  errInk: "#a63a17",
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'DM Sans', Helvetica, Arial, sans-serif",
} as const

/** The brand as guests see it on the site. */
export const brand = {
  name: "Villa du Cassier Jaune",
  wordmark: "VILLA DU CASSIER JAUNE",
  location: "MARTINIQUE",
} as const

/** Subjects are suffixed with the brand, the way the site signs its pages. */
export const subjectOf = (subject: string): string => `${subject} — ${brand.name}`

// ---------------------------------------------------------------------------
// The block vocabulary. Adding a block means teaching both renderers about
// it, which is exactly the point: the text part cannot drift.
// ---------------------------------------------------------------------------

export interface SummaryRow {
  readonly label: string
  readonly value: string
  /** The line that carries the news — the total, the amount due. */
  readonly emphasis?: boolean
}

export type MailBlock =
  | { readonly _tag: "Paragraph"; readonly text: string }
  | { readonly _tag: "Heading"; readonly text: string }
  | { readonly _tag: "Button"; readonly label: string; readonly url: string }
  | { readonly _tag: "Summary"; readonly title?: string; readonly rows: ReadonlyArray<SummaryRow> }
  | { readonly _tag: "Note"; readonly tone: "info" | "alert"; readonly text: string }
  | { readonly _tag: "Quote"; readonly label: string; readonly text: string }
  | { readonly _tag: "Divider" }

export interface MailTemplate {
  readonly subject: string
  /** The one-line teaser mail clients show next to the subject. */
  readonly preheader: string
  /** Small letterspaced label above the title, as on the site's sections. */
  readonly kicker?: string
  readonly title: string
  readonly blocks: ReadonlyArray<MailBlock>
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

const escape = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

const paragraphHtml = (text: string): string =>
  `<p style="margin:0 0 16px;font-family:${mailTheme.sans};font-size:15px;line-height:1.7;color:${mailTheme.ink};">${escape(text)}</p>`

const headingHtml = (text: string): string =>
  `<h2 style="margin:28px 0 12px;font-family:${mailTheme.serif};font-weight:400;font-size:22px;line-height:1.3;color:${mailTheme.title};">${escape(text)}</h2>`

/**
 * A bulletproof button: the background lives on the table cell (Outlook
 * ignores padding and radius on anchors), and the raw URL is repeated
 * underneath for clients that strip the link.
 */
const buttonHtml = (label: string, url: string): string =>
  [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;">',
    "<tr>",
    `<td align="center" bgcolor="${mailTheme.accent}" style="border-radius:5px;">`,
    `<a href="${escape(url)}" style="display:inline-block;padding:15px 30px;font-family:${mailTheme.sans};font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:5px;">${escape(label)}</a>`,
    "</td>",
    "</tr>",
    "</table>",
    `<p style="margin:0 0 16px;font-family:${mailTheme.sans};font-size:12.5px;line-height:1.6;color:${mailTheme.muted2};word-break:break-all;">${escape(url)}</p>`,
  ].join("")

const summaryRowHtml = (row: SummaryRow, last: boolean): string => {
  const border = last ? "none" : `1px solid ${mailTheme.lineSoft}`
  const value = row.emphasis
    ? `font-family:${mailTheme.serif};font-size:20px;color:${mailTheme.title};`
    : `font-family:${mailTheme.sans};font-size:14px;color:${mailTheme.inkStrong};`
  return [
    "<tr>",
    `<td style="padding:10px 0;border-bottom:${border};font-family:${mailTheme.sans};font-size:13.5px;color:${mailTheme.muted};">${escape(row.label)}</td>`,
    `<td align="right" style="padding:10px 0;border-bottom:${border};${value}">${escape(row.value)}</td>`,
    "</tr>",
  ].join("")
}

const summaryHtml = (title: string | undefined, rows: ReadonlyArray<SummaryRow>): string =>
  [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background:${mailTheme.bg};border:1px solid ${mailTheme.lineSoft};border-radius:5px;">`,
    "<tr><td style=\"padding:6px 20px 14px;\">",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
    title === undefined
      ? ""
      : `<tr><td colspan="2" style="padding:12px 0 4px;font-family:${mailTheme.sans};font-size:12px;letter-spacing:0.26em;color:${mailTheme.muted2};">${escape(title.toUpperCase())}</td></tr>`,
    rows.map((row, index) => summaryRowHtml(row, index === rows.length - 1)).join(""),
    "</table>",
    "</td></tr>",
    "</table>",
  ].join("")

const noteHtml = (tone: "info" | "alert", text: string): string => {
  const background = tone === "alert" ? mailTheme.errBg : mailTheme.okBg
  const color = tone === "alert" ? mailTheme.errInk : mailTheme.okInk
  return `<p style="margin:20px 0;padding:13px 16px;border-radius:5px;background:${background};font-family:${mailTheme.sans};font-size:13.5px;line-height:1.6;color:${color};">${escape(text)}</p>`
}

const quoteHtml = (label: string, text: string): string =>
  [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background:${mailTheme.cream};border-left:3px solid ${mailTheme.accent};border-radius:0 5px 5px 0;">`,
    '<tr><td style="padding:16px 20px;">',
    `<div style="font-family:${mailTheme.sans};font-size:12px;letter-spacing:0.26em;color:${mailTheme.muted2};padding-bottom:8px;">${escape(label.toUpperCase())}</div>`,
    `<div style="font-family:${mailTheme.serif};font-size:18px;line-height:1.5;color:${mailTheme.title};">${escape(text)}</div>`,
    "</td></tr>",
    "</table>",
  ].join("")

const dividerHtml = (): string =>
  `<div style="margin:26px 0;height:1px;background:${mailTheme.line};line-height:1px;font-size:0;">&nbsp;</div>`

const blockHtml = (block: MailBlock): string => {
  switch (block._tag) {
    case "Paragraph":
      return paragraphHtml(block.text)
    case "Heading":
      return headingHtml(block.text)
    case "Button":
      return buttonHtml(block.label, block.url)
    case "Summary":
      return summaryHtml(block.title, block.rows)
    case "Note":
      return noteHtml(block.tone, block.text)
    case "Quote":
      return quoteHtml(block.label, block.text)
    case "Divider":
      return dividerHtml()
  }
}

/** The deep-green bar carrying the wordmark, as on every page but the home. */
const headerHtml = (): string =>
  [
    `<tr><td bgcolor="${mailTheme.greenDeep}" style="padding:26px 32px;border-radius:8px 8px 0 0;">`,
    `<div style="font-family:${mailTheme.serif};font-size:19px;letter-spacing:0.14em;color:#ffffff;line-height:1;">${brand.wordmark}</div>`,
    `<div style="font-family:${mailTheme.sans};font-size:9.5px;letter-spacing:0.3em;color:rgba(255,255,255,0.62);padding-top:6px;">${brand.location}</div>`,
    "</td></tr>",
  ].join("")

/** The detached green box the site closes its pages with. */
const footerHtml = (): string =>
  [
    '<tr><td style="padding:22px 0 0;">',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${mailTheme.greenDeep};border-radius:8px;">`,
    '<tr><td style="padding:22px 26px;">',
    `<div style="font-family:${mailTheme.sans};font-size:12.5px;line-height:1.7;color:rgba(255,255,255,0.72);">© ${new Date().getUTCFullYear()} ${brand.name} – Tous droits réservés</div>`,
    `<div style="font-family:${mailTheme.sans};font-size:12px;line-height:1.7;color:rgba(255,255,255,0.5);">Message automatique — merci de ne pas y répondre.</div>`,
    "</td></tr></table>",
    "</td></tr>",
  ].join("")

const htmlOf = (template: MailTemplate): string =>
  [
    "<!doctype html>",
    '<html lang="fr">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escape(template.subject)}</title>`,
    "</head>",
    `<body style="margin:0;padding:0;background:${mailTheme.bg};-webkit-font-smoothing:antialiased;">`,
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(template.preheader)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${mailTheme.bg};">`,
    '<tr><td align="center" style="padding:28px 16px 40px;">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">',
    headerHtml(),
    `<tr><td style="padding:34px 32px 30px;background:#ffffff;border:1px solid ${mailTheme.line};border-top:none;border-radius:0 0 8px 8px;">`,
    template.kicker === undefined
      ? ""
      : `<div style="font-family:${mailTheme.sans};font-size:12px;letter-spacing:0.26em;color:${mailTheme.muted2};padding-bottom:12px;">${escape(template.kicker.toUpperCase())}</div>`,
    `<h1 style="margin:0 0 20px;font-family:${mailTheme.serif};font-weight:400;font-size:32px;line-height:1.2;color:${mailTheme.title};">${escape(template.title)}</h1>`,
    template.blocks.map(blockHtml).join(""),
    "</td></tr>",
    footerHtml(),
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("\n")

// ---------------------------------------------------------------------------
// Plain-text rendering — the same blocks, flattened. Every link and every
// amount survives here; only the chrome is dropped.
// ---------------------------------------------------------------------------

const blockText = (block: MailBlock): ReadonlyArray<string> => {
  switch (block._tag) {
    case "Paragraph":
      return [block.text, ""]
    case "Heading":
      return [block.text, ""]
    case "Button":
      return [`${block.label} : ${block.url}`, ""]
    case "Summary":
      return [
        ...(block.title === undefined ? [] : [block.title]),
        ...block.rows.map((row) => `${row.label} : ${row.value}`),
        "",
      ]
    case "Note":
      return [block.text, ""]
    case "Quote":
      return [`${block.label} : ${block.text}`, ""]
    case "Divider":
      return ["—", ""]
  }
}

const textOf = (template: MailTemplate): string =>
  [
    `${brand.wordmark} — ${brand.location}`,
    "",
    template.title,
    "",
    ...template.blocks.flatMap(blockText),
    "—",
    `© ${new Date().getUTCFullYear()} ${brand.name} – Tous droits réservés`,
    "Message automatique — merci de ne pas y répondre.",
  ].join("\n")

/**
 * Renders a template for one recipient. `body` stays the plain-text part, so
 * every Mailer adapter keeps working unchanged; adapters that know how to
 * send multipart pick up `html`.
 */
export const renderMail = (to: string, template: MailTemplate): OutgoingMail => ({
  to,
  subject: template.subject,
  body: textOf(template),
  html: htmlOf(template),
})
