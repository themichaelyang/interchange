type BoundsLiteral = [number, number]

// inclusive range
class Bounds {
  constructor(public min: number, public max: number) {}
  
  static new = (min: number, max: number) => 
    new Bounds(min, max)
  
  static orLiteral = (b: Bounds | BoundsLiteral) =>
    b instanceof Bounds ? b : Bounds.new(b[0], b[1])

  to_a = () => [this.min, this.max]
  includes = (n: number) => this.min <= n && n <= this.max
}

class Int extends Number {
  constructor(public n: number) { super(n) }
  static new = (n: number) => new Int(n)

  within = (b: Bounds | BoundsLiteral) => 
    Bounds.orLiteral(b).includes(this.valueOf())
}

class Maybe<T> {
  constructor(public val: T | Error) {}
  static new = (val: any) => new Maybe(val)
}

class ParseError extends Error {
  static new = (...args: any[]) => new ParseError(...args)
}

function parse_bcd_digit(nibble: number) {
  if (!Bounds.new(0, 9).includes(nibble)) return ParseError.new('out of range')
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