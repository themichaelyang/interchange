import { ParseError } from "./parse_error"
import { Interval } from './interval'

class Maybe<T> {
  constructor(public val: T | Error) {}
  static new = (val: any) => new Maybe(val)
}

function parse_bcd_digit(nibble: number) {
  if (!Interval.new(0, 9).includes(nibble)) return ParseError.new('out of range')
  return nibble
}

function errored(val: any): val is Error {
  return val instanceof Error
}

function puts(...args: any[]) {
  console.log(...args)
}

export function parse_unsigned_packed_bcd(bytes: number) {
  // in bcd, we interpret hex digits 0-9 as if decimal, ignoring a-f.
  let hex = bytes.toString(16)
  if (!/[0-9]+/.test(hex)) return ParseError.new('invalid unpacked binary values')
  return parseInt(hex)
}