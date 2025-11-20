export class ParseError extends Error {
  static new = (...args: any[]) => new ParseError(...args)
}