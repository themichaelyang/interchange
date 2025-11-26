export type IntervalLiteral = [number, number]
export type IntervalOrLiteral = Interval | IntervalLiteral

// inclusive range / closed interval
export class Interval {
  constructor(public min: number, public max: number) {}
  
  static new = (min: number, max: number) => 
    new Interval(min, max)
  
  static or_literal = (b: IntervalOrLiteral) =>
    b instanceof Interval ? b : Interval.new(b[0], b[1])

  to_a = () => [this.min, this.max]
  includes = (n: number) => this.min <= n && n <= this.max

  static from_range = (start: number, end: number) => Interval.new(start, end - 1)
  static from_length = (start: number, length: number) => Interval.new(start, start + length - 1)
  to_range = () => [this.min, this.max]
  to_start_length = () => [this.min, this.max - this.min + 1]
  length = () => this.max - this.min + 1
}

export class Int extends Number {
  constructor(public n: number) { super(n) }
  static new = (n: number) => new Int(n)

  static from = (x: Int | number) => {
    if (x instanceof Int) return x
    else if (Number.isInteger(x)) return Int.new(x)
    else throw new Error("not a valid integer")
  }
  
  within = (b: IntervalOrLiteral) => 
    Interval.or_literal(b).includes(this.valueOf())

  divmod = (x: Int | number): [number, number] => {
    x = Int.from(x)
    return [Math.floor(this.n / x.n), this.n % x.n]
  }

  static is_int(x: unknown): x is number {
    return Number.isInteger(x)
  }
}