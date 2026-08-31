import { describe, expect, test } from "bun:test"
import {
  cleanStay,
  fillContactGaps,
  fillStayGaps,
  nightsBetween,
  stayQueryParams,
  todayIso,
  type StayState,
} from "./form-state"

describe("nightsBetween", () => {
  test("counts whole nights", () => {
    expect(nightsBetween("2026-03-04", "2026-03-11")).toBe(7)
    expect(nightsBetween("2026-03-04", "2026-03-04")).toBe(0)
    expect(nightsBetween("2026-03-11", "2026-03-04")).toBe(0)
    expect(nightsBetween("", "2026-03-04")).toBe(0)
    expect(nightsBetween("pas-une-date", "2026-03-04")).toBe(0)
  })
})

describe("cleanStay", () => {
  test("drops dates whose arrival already passed, keeps guests", () => {
    const cleaned = cleanStay({ arrivee: "2026-01-02", depart: "2026-01-09", voyageurs: "4" }, "2026-02-01")
    expect(cleaned).toEqual({ arrivee: "", depart: "", voyageurs: "4" })
  })

  test("keeps a future stay as-is", () => {
    const stay: StayState = { arrivee: "2026-03-04", depart: "2026-03-11", voyageurs: "6" }
    expect(cleanStay(stay, "2026-02-01")).toEqual(stay)
  })

  test("keeps a stay starting today", () => {
    const stay: StayState = { arrivee: "2026-02-01", depart: "2026-02-08", voyageurs: "2" }
    expect(cleanStay(stay, "2026-02-01")).toEqual(stay)
  })

  test("sanitizes the guest count back into range", () => {
    expect(cleanStay({ arrivee: "", depart: "", voyageurs: "42" }, "2026-02-01").voyageurs).toBe("2")
    expect(cleanStay({ arrivee: "", depart: "", voyageurs: "" }, "2026-02-01").voyageurs).toBe("2")
    expect(cleanStay({ arrivee: "", depart: "", voyageurs: "8" }, "2026-02-01").voyageurs).toBe("8")
  })
})

describe("fillStayGaps", () => {
  test("base wins field by field, fallback fills the blanks", () => {
    expect(
      fillStayGaps({ arrivee: "2026-05-01", depart: "", voyageurs: "5" }, {
        arrivee: "2026-03-01",
        depart: "2026-03-08",
        voyageurs: "2",
      }),
    ).toEqual({ arrivee: "2026-05-01", depart: "2026-03-08", voyageurs: "5" })
  })
})

describe("stayQueryParams", () => {
  test("only carries non-empty fields", () => {
    expect(stayQueryParams({ arrivee: "2026-05-01", depart: "", voyageurs: "3" })).toEqual({
      arrivee: "2026-05-01",
      voyageurs: "3",
    })
    expect(stayQueryParams({ arrivee: "", depart: "", voyageurs: "" })).toEqual({})
  })
})

describe("fillContactGaps", () => {
  test("stored values win, profile fills the gaps", () => {
    expect(
      fillContactGaps({ prenom: "Marie", email: "marie@mail.com" }, { prenom: "Ada", nom: "Dupont", tel: "+33 6" }),
    ).toEqual({ prenom: "Marie", nom: "Dupont", email: "marie@mail.com", tel: "+33 6" })
  })
})

describe("todayIso", () => {
  test("formats with zero padding", () => {
    expect(todayIso(new Date(2026, 0, 9))).toBe("2026-01-09")
    expect(todayIso(new Date(2026, 10, 20))).toBe("2026-11-20")
  })
})
