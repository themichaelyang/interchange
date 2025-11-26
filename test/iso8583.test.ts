
import { describe, expect, test } from "bun:test"
import { AsciiMessage, Bitmap } from "../lib/iso8583"

describe("ACSII ISO8583", () => {
  const financial_transaction = "0200323A40010841801038000000000000000004200508050113921208050420042251320720 000010000001156040800411 01251146333156336000299"

  test("parses message type identifier", () => {
    console.log(AsciiMessage.unpack(financial_transaction))
    expect(
      AsciiMessage.unpack(financial_transaction).message_type_indicator
    ).toEqual("0200")
  })

  test("parses primary bitmap on its own", () => {
    expect(
      AsciiMessage.get_singleton().primary_bitmap.decode("F4570004A41100F8")
    ).toEqual(Bitmap.new([
      1, 1, 1, 1,
      0, 1, 0, 0,
      0, 1, 0, 1,
      0, 1, 1, 1,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 1, 0, 0,
      1, 0, 1, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 0,
      0, 0, 0, 0,
      1, 1, 1, 1,
      1, 0, 0, 0,
    ].map(b => !!b)))
  })

  test("ignores secondary bitmap if first bit of primary bitmap is 0", () => {
    expect(
      AsciiMessage.unpack("020074570004A41100F835001180C0100000").secondary_bitmap
    ).toBeUndefined()
  })

  test("parses primary and secondary bitmap", () => {
    const parsed =AsciiMessage.unpack("0200F4570004A41100F835001180C0100000")

    expect(parsed.primary_bitmap)
      .toEqual(Bitmap.new([
        1, 1, 1, 1,
        0, 1, 0, 0,
        0, 1, 0, 1,
        0, 1, 1, 1,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 1, 0, 0,
        1, 0, 1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 0,
        0, 0, 0, 0,
        1, 1, 1, 1,
        1, 0, 0, 0,
      ].map(b => !!b)))

    expect(parsed.secondary_bitmap.bools)
      .toEqual(Bitmap.new([
        0, 0, 1, 1,
        0, 1, 0, 1,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 1,
        0, 0, 0, 1,
        1, 0, 0, 0,
        0, 0, 0, 0,
        1, 1, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 1,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
      ].map(b => !!b)).bools)
  })
}) 