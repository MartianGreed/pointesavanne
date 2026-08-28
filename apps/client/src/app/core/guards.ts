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

/** The owner area: customers can reach the shell, the API enforces the role. */
export const ownerGuard: CanActivateFn = async () => {
  const auth = inject(Auth)
  const router = inject(Router)
  if (auth.user() === undefined) await auth.refresh()
  return auth.signedIn() ? true : router.createUrlTree(["/connexion"])
}
