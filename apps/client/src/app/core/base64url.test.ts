import { describe, expect, test } from "bun:test"
import { fromBase64Url, toBase64Url } from "./base64url"

const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text)

describe("toBase64Url", () => {
  test("encodes RFC 4648 test vectors without padding", () => {
    expect(toBase64Url(bytesOf(""))).toBe("")
    expect(toBase64Url(bytesOf("f"))).toBe("Zg")
    expect(toBase64Url(bytesOf("fo"))).toBe("Zm8")
    expect(toBase64Url(bytesOf("foobar"))).toBe("Zm9vYmFy")
  })

  test("replaces the URL-unsafe alphabet", () => {
    // 0xFB 0xFF 0xBF encodes to "+/+/" in standard base64 → "-_-" in base64url.
    expect(toBase64Url(new Uint8Array([0xfb, 0xff, 0xbf]))).toBe("-_-_")
  })

  test("accepts ArrayBuffers and Uint8Arrays identically", () => {
    const bytes = bytesOf("passkey")
    expect(toBase64Url(bytes.buffer as ArrayBuffer)).toBe(toBase64Url(bytes))
  })
})

describe("fromBase64Url", () => {
  test("decodes RFC 4648 test vectors", () => {
    expect(new TextDecoder().decode(fromBase64Url(""))).toBe("")
    expect(new TextDecoder().decode(fromBase64Url("Zg"))).toBe("f")
    expect(new TextDecoder().decode(fromBase64Url("Zm8"))).toBe("fo")
    expect(new TextDecoder().decode(fromBase64Url("Zm9vYmFy"))).toBe("foobar")
  })

  test("accepts padded input and decodes arbitrary binary", () => {
    const original = new Uint8Array([0, 1, 2, 250, 251, 255, 128])
    expect(fromBase64Url(toBase64Url(original))).toEqual(original)
    expect(fromBase64Url("Zm9vYmFy==")).toEqual(bytesOf("foobar"))
  })

  test("round-trips every byte value", () => {
    const all = new Uint8Array(256)
    for (let byte = 0; byte < 256; byte += 1) all[byte] = byte
    expect(fromBase64Url(toBase64Url(all))).toEqual(all)
  })

  test("rejects characters outside the base64url alphabet", () => {
    expect(() => fromBase64Url("a+b/c")).toThrow()
    expect(() => fromBase64Url("hé")).toThrow()
  })
})
