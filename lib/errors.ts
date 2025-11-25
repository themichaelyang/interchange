export class ParseError extends Error {
  static new = (...args: any[]) => new ParseError(...args)
}

export class AnyError extends Error {
  // typed so any subclass calling .new will be typed as the subclass, not AnyError
  // constructor types (e.g. class constructor type) vs instance types (we usually denote with the class name)
  static new<C extends new (...args: any[]) => T, T extends AnyError>(this: C, ...args: ConstructorParameters<C>): InstanceType<C> {
    return new this(...args) as InstanceType<C>
  }

  // this also checks
  // static new<T extends AnyError>(this: new (...args: any[]) => T, ...args: ConstructorParameters<new (...args: any[]) => T>): T {
  //   return new this(...args)
  // }
}

export class ValidationError extends AnyError {}

const _type_check: ValidationError = ValidationError.new("Invalid message type indicator version")