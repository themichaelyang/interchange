import { Int, Interval, type IntervalLiteral, type IntervalOrLiteral } from "./interval"

export class Bytes {
  constructor(
    public bytes: Uint8Array
  ) {}

  static new = (bytes: Uint8Array) => new Bytes(bytes)
  static from = (array: number[]) => Bytes.new(Uint8Array.from(array))

  at = (index: number) => this.bytes[index]

  #between = (interval: Interval) => this.bytes.subarray(interval.min, interval.max + 1)
  between = (interval: IntervalOrLiteral) => this.#between(Interval.or_literal(interval))
}