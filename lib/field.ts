import { Interval } from "./interval"

export interface FieldCodec<E, D, I=D> {
  encode: (decoded: D, length: number) => E,
  decode: (encoded: E) => D
  interpret?: (decoded: D) => I
  translate?: (interpreted: I) => D
}

export interface FieldCondition {
  check: () => boolean
  register: (condition: boolean) => boolean
}

export interface LengthCodec<E> {
  decode: (encoded: E) => number
  encode: (length: number) => E
  // TODO: hope there are no variable size lengths, then will have weird lookahead logic
  size: number
}

// T defaults to FieldCodec<E, D> if not provided
// Otherwise, T is generic and can narrow the FieldCodec type
export class Field<E, D, T extends FieldCodec<E, D> = FieldCodec<E, D>> {
  public length: number | LengthCodec<any>
  public type: T
  public condition?: FieldCondition

  constructor({length, type, condition}: {
    length: number | LengthCodec<any>,
    type: T,
    condition?: FieldCondition
  }) {
    this.length = length
    this.type = type
    this.condition = condition
  }

  decode(encoded: E): D {
    return this.type.decode(encoded)
  }

  // infer unpacks the type from the generic and binds to a type variable
  static new = <NT extends FieldCodec<any, any>>(args: {
    length: number | LengthCodec<any>,
    type: NT,
    condition?: FieldCondition
  }): Field<
    NT extends FieldCodec<infer NE, any> ? NE : never,
    NT extends FieldCodec<any, infer ND> ? ND : never,
    NT
  > => new Field(args as any)
}
