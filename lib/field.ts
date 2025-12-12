// 1. data -> value (decode, unpack)
// 2. value -> data (encode, pack)
// 3. value -> interpretation (interpret)
// 4. interpretation -> value (translate)
export interface FieldCodec<Enc, Dec, Interp=Dec> {
  encode: (decoded: Dec, length: number) => Enc,
  decode: (encoded: Enc) => Dec
  interpret?: (decoded: Dec) => Interp
  translate?: (interpreted: Interp) => Dec
}

// FieldCondition indicates whether or not a field should be included
export interface FieldCondition {
  check: () => boolean
  register: (condition: boolean) => boolean
}

export interface LengthCodec<Enc> {
  decode: (encoded: Enc) => number
  encode: (length: number) => Enc
  // TODO: hope there are no variable size lengths, then will have weird lookahead logic
  size: number
}

// T defaults to FieldCodec<E, D> if not provided
// Otherwise, T is generic and can narrow the FieldCodec type
export class Field<
  Enc,
  Dec,
  T extends FieldCodec<Enc, Dec> = FieldCodec<Enc, Dec>,
  Cond extends (FieldCondition | null) = (FieldCondition | null),
> {
  public length: number | LengthCodec<any>
  public type: T
  public condition: Cond

  // don't use me directly! generic types are not inferred here
  constructor({length, type, condition}: {
    length: number | LengthCodec<any>,
    type: T,
    condition: Cond
  }) {
    this.length = length
    this.type = type
    this.condition = condition
  }

  decode(encoded: Enc): Dec {
    return this.type.decode(encoded)
  }

  // static method infers the generic types and binds them to class
  // infer unpacks the type from the generic and binds to a type variable
  static new = <
    NT extends FieldCodec<any, any>,
    C
  >(args: {
    length: number | LengthCodec<any>,
    type: NT,
    condition?: C
  }): Field<
    NT extends FieldCodec<infer NE, any> ? NE : never,
    NT extends FieldCodec<any, infer ND> ? ND : never,
    NT,
    C extends FieldCondition ? C : null
  > => new Field(args as any)
}
