import { setWorldConstructor } from "@cucumber/cucumber"
import { Effect } from "effect"
import { buildTestWorld, type BuiltWorld } from "../../composition.ts"

interface QuotationRequestData {
  villaName: string
  from: string
  to: string
  adultsCount: number
  childrenCount: number
}

/**
 * Per-scenario world: a freshly built in-memory composition (event store,
 * views, auth, buses, recording doubles) plus the givens accumulated so far.
 */
export class TestWorld {
  world?: BuiltWorld

  readonly customers = new Map<string, { userId: string }>()
  readonly registeredPasswords = new Map<string, string>()
  sessions = new Map<string, string>()
  currentEmail?: string

  villaName = ""
  cautionAmount = 0
  householdAmount = 0
  seasonalRanges: Array<{ from: string; to: string; weeklyAmount: number }> = []
  discountRanges: Array<{ fromNights: number; toNights: number; percent: number }> = []

  registerRequest?: { email: string; password: string; phone: string; firstname: string; lastname: string }
  loginRequest?: { email: string; password: string }
  recoverRequestEmail?: string
  updatePasswordRequest?: { email: string | null; currentPassword: string | null; newPassword: string }
  lastResetToken?: string

  quotationRequest?: QuotationRequestData
  quotationResult?: { bookingId: string; status: string; pricing: Record<string, number> }
  quotationOwnerId?: string
  emailCountMark = 0
  exception?: { _tag: string; message: string; issues?: ReadonlyArray<string> }
  profileRequest?: { language?: string; firstname?: string; lastname?: string; line1?: string; line3?: string }

  async ensure() {
    if (this.world === undefined) {
      this.world = await Effect.runPromise(buildTestWorld())
    }
    return this.world
  }
}

setWorldConstructor(TestWorld)

export type CucumberWorld = TestWorld
