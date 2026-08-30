/**
 * base64url codec for WebAuthn wire fields. The auth API exchanges every
 * binary credential field (challenge, credential id, client data, signature,
 * attestation, authenticator data) as unpadded base64url strings; the
 * browser's WebAuthn API speaks ArrayBuffers. These helpers bridge the two.
 */

const ALPHABET = /^[A-Za-z0-9_-]*$/u

/** Encodes bytes as unpadded base64url. */
export const toBase64Url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ""
  for (const byte of view) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

/** Decodes an unpadded (or trivially padded) base64url string into a fresh byte buffer. */
export const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const unpadded = value.replace(/=+$/u, "")
  if (!ALPHABET.test(unpadded)) throw new Error(`invalid base64url string`)
  const padded = unpadded.replaceAll("-", "+").replaceAll("_", "/")
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4)
  const binary = atob(withPadding)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
