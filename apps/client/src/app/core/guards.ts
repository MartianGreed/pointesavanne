import { inject } from "@angular/core"
import { CanActivateFn, Router } from "@angular/router"
import { Auth } from "./auth.service"

/** Waits for the session to load, then requires a signed-in customer. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth)
  const router = inject(Router)
  if (auth.user() === undefined) await auth.refresh()
  return auth.signedIn() ? true : router.createUrlTree(["/connexion"])
}

/**
 * The owner area: the API still enforces `booking:read-all` on every call,
 * but the client now knows the principal's permissions (GET /me) and sends
 * non-owners back to their customer area — silently.
 */
export const ownerGuard: CanActivateFn = async () => {
  const auth = inject(Auth)
  const router = inject(Router)
  if (auth.user() === undefined) await auth.refresh()
  if (!auth.signedIn()) return router.createUrlTree(["/connexion"])
  return auth.isOwner() ? true : router.createUrlTree(["/espace-client"])
}
