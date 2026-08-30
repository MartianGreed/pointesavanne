import { ApiError } from "./api"

/**
 * Maps passkey-ceremony failures onto safe, actionable French messages.
 * The auth API classifies its refusals as `{ error: Tag, message }` (surfaced
 * by ApiError as `problem`); the browser reports cancel/unsupported cases as
 * a DOMException named NotAllowedError.
 */

const errorTag = (e: unknown): string => {
  if (e instanceof ApiError) return e.problem.error ?? ""
  if (typeof e === "object" && e !== null && "error" in e && typeof (e as { error: unknown }).error === "string") {
    return (e as { error: string }).error
  }
  return ""
}

/** One message per known failure mode, falling back to `fallback`. */
export const passkeyErrorMessage = (e: unknown, fallback: string): string => {
  if (e instanceof DOMException && e.name === "NotAllowedError") {
    return "Opération annulée ou clé d'accès non disponible sur cet appareil."
  }
  const tag = errorTag(e)
  if (tag === "InvalidCredentials") {
    return "Aucune clé d'accès reconnue. Connectez-vous avec votre mot de passe, puis enregistrez une clé d'accès depuis votre espace client."
  }
  if (tag === "UnsupportedPasskey") {
    return "Cette clé d'accès ou ce navigateur n'est pas pris en charge."
  }
  if (tag === "EmailNotVerified") {
    return "Vérifiez d'abord votre adresse e-mail (lien reçu par e-mail)."
  }
  if (tag === "InvalidAuthToken") {
    return "La demande a expiré. Réessayez."
  }
  return fallback
}
