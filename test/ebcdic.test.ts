import { describe, expect, test } from "bun:test"
import { ascii_to_ebcdic, parse_alphanumeric_ebcdic } from "../lib/encodings/ebcdic"

describe('ascii_to_ebcdic', () => {
  test('converts to ebcdic', () => {
    expect(ascii_to_ebcdic('hello world')).toEqual([0x88, 0x85, 0x93, 0x93, 0x96, 0x40, 0xA6, 0x96, 0x99, 0x93, 0x84])
  })
})

describe('parse_alphanumeric_ebcdic', () => {
  test('round trip conversion', () => {
    expect(parse_alphanumeric_ebcdic(Uint8Array.from(ascii_to_ebcdic('hello world'))))
      .toBe('hello world')
    expect(parse_alphanumeric_ebcdic(Uint8Array.from(ascii_to_ebcdic('abcdefghijklmnopqrztuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123456790'))))
      .toBe('abcdefghijklmnopqrztuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123456790')
  })
})
