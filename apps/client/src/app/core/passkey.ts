import { fromBase64Url, toBase64Url } from "./base64url"

/**
 * The passkey ceremonies, translated between the auth API's base64url wire
 * format and the browser's WebAuthn buffer format. Everything here runs in
 * click handlers only — never during SSR.
 */

/** What POST /auth/passkeys/register/options returns. */
export interface PasskeyRegistrationOptions {
  readonly challenge: string
  readonly rp: { readonly id: string; readonly name: string }
  readonly user: { readonly id: string; readonly name: string; readonly displayName: string }
  readonly pubKeyCredParams: ReadonlyArray<{ readonly type: "public-key"; readonly alg: -7 | -257 | -8 }>
  readonly timeout: number
  readonly attestation: "none"
  readonly authenticatorSelection: {
    readonly residentKey: "preferred"
    readonly userVerification: "required" | "preferred"
  }
  readonly excludeCredentials: ReadonlyArray<{
    readonly type: "public-key"
    readonly id: string
    readonly transports: ReadonlyArray<string>
  }>
}

/** What POST /auth/passkeys/authenticate/options returns. */
export interface PasskeyAuthenticationOptions {
  readonly challenge: string
  readonly rpId: string
  readonly timeout: number
  readonly userVerification: "required" | "preferred"
  readonly allowCredentials?: ReadonlyArray<{
    readonly type: "public-key"
    readonly id: string
    readonly transports: ReadonlyArray<string>
  }>
}

/** The body POST /auth/passkeys/register/verify expects. */
export interface PasskeyRegistrationResult {
  readonly credentialId: string
  readonly response: {
    readonly clientDataJSON: string
    readonly attestationObject: string
    readonly transports?: ReadonlyArray<string>
  }
}

/** The body POST /auth/passkeys/authenticate/verify expects. */
export interface PasskeyAuthenticationResult {
  readonly credentialId: string
  readonly response: {
    readonly clientDataJSON: string
    readonly authenticatorData: string
    readonly signature: string
    readonly userHandle?: string
  }
}

/** True when the current browser exposes the WebAuthn API. */
export const passkeysSupported = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.PublicKeyCredential !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.credentials !== "undefined"

/**
 * Runs the registration ceremony. `NotAllowedError` means the user canceled
 * or the browser refused (unsupported authenticator, no user verification);
 * every other failure is unexpected. Both surface as exceptions to the caller.
 */
export const createPasskey = async (
  options: PasskeyRegistrationOptions,
): Promise<PasskeyRegistrationResult> => {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      rp: options.rp,
      user: { ...options.user, id: fromBase64Url(options.user.id) },
      pubKeyCredParams: [...options.pubKeyCredParams],
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
      excludeCredentials: options.excludeCredentials.map((entry) => ({
        ...entry,
        id: fromBase64Url(entry.id),
        transports: [...entry.transports] as AuthenticatorTransport[],
      })),
    },
  })) as PublicKeyCredential | null
  if (credential === null) throw new DOMException("passkey creation was dismissed", "NotAllowedError")

  const response = credential.response as AuthenticatorAttestationResponse
  const transports = typeof response.getTransports === "function" ? response.getTransports() : []
  return {
    credentialId: toBase64Url(credential.rawId),
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
      ...(transports.length > 0 ? { transports } : {}),
    },
  }
}

/** Runs the authentication ceremony and returns the verify-endpoint body. */
export const authenticatePasskey = async (
  options: PasskeyAuthenticationOptions,
): Promise<PasskeyAuthenticationResult> => {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification,
      ...(options.allowCredentials === undefined
        ? {}
        : {
            allowCredentials: options.allowCredentials.map((entry) => ({
              ...entry,
              id: fromBase64Url(entry.id),
              transports: [...entry.transports] as AuthenticatorTransport[],
            })),
          }),
    },
  })) as PublicKeyCredential | null
  if (credential === null) throw new DOMException("passkey authentication was dismissed", "NotAllowedError")

  const response = credential.response as AuthenticatorAssertionResponse
  const userHandle =
    response.userHandle === null || response.userHandle === undefined
      ? undefined
      : toBase64Url(response.userHandle)
  return {
    credentialId: toBase64Url(credential.rawId),
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      authenticatorData: toBase64Url(response.authenticatorData),
      signature: toBase64Url(response.signature),
      ...(userHandle === undefined ? {} : { userHandle }),
    },
  }
}
