import { Routes } from "@angular/router"
import { authGuard, ownerGuard } from "./core/guards"
import { HomePage } from "./pages/home.page"
import { GalleryPage } from "./pages/gallery.page"
import { LoginPage } from "./pages/login.page"
import { VerifyEmailPage } from "./pages/verify-email.page"
import { ForgotPasswordPage } from "./pages/forgot-password.page"
import { ResetPasswordPage } from "./pages/reset-password.page"
import { QuotationPage } from "./pages/quotation.page"
import { CustomerAreaPage } from "./pages/customer-area.page"
import { OwnerBookingsPage } from "./pages/owner-bookings.page"
import { OwnerRateCardPage } from "./pages/owner-rate-card.page"

export const routes: Routes = [
  { path: "", component: HomePage },
  { path: "galerie", component: GalleryPage },
  { path: "connexion", component: LoginPage },
  { path: "inscription", redirectTo: "connexion" },
  { path: "verification", component: VerifyEmailPage },
  { path: "mot-de-passe/oublie", component: ForgotPasswordPage },
  { path: "mot-de-passe/reinitialiser", component: ResetPasswordPage },
  { path: "devis", component: QuotationPage },
  { path: "espace-client", component: CustomerAreaPage, canActivate: [authGuard] },
  { path: "proprietaire/reservations", component: OwnerBookingsPage, canActivate: [ownerGuard] },
  { path: "proprietaire/tarifs", component: OwnerRateCardPage, canActivate: [ownerGuard] },
  { path: "**", redirectTo: "" },
]
