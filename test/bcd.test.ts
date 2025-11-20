import { describe, expect, test } from "bun:test"
import { parse_unsigned_packed_bcd } from "../lib/bcd"

describe("packed bcd", () => {
  test("parsing", () => {
    expect(parse_unsigned_packed_bcd(0x00)).toBe(0)
    expect(parse_unsigned_packed_bcd(0x01)).toBe(1)
    expect(parse_unsigned_packed_bcd(0x02)).toBe(2)
    expect(parse_unsigned_packed_bcd(0x03)).toBe(3)
    expect(parse_unsigned_packed_bcd(0x04)).toBe(4)
    expect(parse_unsigned_packed_bcd(0x05)).toBe(5)
    expect(parse_unsigned_packed_bcd(0x06)).toBe(6)
    expect(parse_unsigned_packed_bcd(0x07)).toBe(7)
    expect(parse_unsigned_packed_bcd(0x08)).toBe(8)
    expect(parse_unsigned_packed_bcd(0x09)).toBe(9)
    expect(parse_unsigned_packed_bcd(0x10)).toBe(10)
    expect(parse_unsigned_packed_bcd(0x11)).toBe(11)
    expect(parse_unsigned_packed_bcd(0x12)).toBe(12)
    expect(parse_unsigned_packed_bcd(0x12345678)).toBe(12345678)

    // Just to show the binary explicitly
    expect(parse_unsigned_packed_bcd(0b0001)).toBe(1)
    expect(parse_unsigned_packed_bcd(0b0010)).toBe(2)
    expect(parse_unsigned_packed_bcd(0b0011)).toBe(3)
    expect(parse_unsigned_packed_bcd(0b0100)).toBe(4)
    expect(parse_unsigned_packed_bcd(0b0101)).toBe(5)
    expect(parse_unsigned_packed_bcd(0b0110)).toBe(6)
    expect(parse_unsigned_packed_bcd(0b0111)).toBe(7)
    expect(parse_unsigned_packed_bcd(0b1000)).toBe(8)
    expect(parse_unsigned_packed_bcd(0b1001)).toBe(9)
    expect(parse_unsigned_packed_bcd(0b10000)).toBe(10)
  })
})