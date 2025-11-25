
import { describe, expect, test } from "bun:test"
import { AsciiMessage } from "../lib/iso8583"

describe("ACSII ISO8583", () => {
  test("parses message type identifier", () => {
    const financial_transaction = "0200323A40010841801038000000000000000004200508050113921208050420042251320720 000010000001156040800411 01251146333156336000299"
    console.log(AsciiMessage.unpack(financial_transaction))
    expect(
      AsciiMessage.unpack(financial_transaction).message_type_indicator
    ).toEqual("0200")
  })
}) 