import { Int } from './interval'

// 1. data -> value (decode, unpack)
// 2. value -> data (encode, pack)
// 3. value -> interpretation (interpret)
// 4. interpretation -> value (translate)
export interface FieldCodec<Enc, Dec, Interp=Dec> {
  encode(decoded: Dec, length?: number): Enc,
  // encode: (decoded: Dec, length: number) => EncLen,

  // TODO: could move length down, since it is a property of the codec, not the field?
  // since its options vary with the codec (e.g. not every codec can support being
  // variable length).
  // encode_without_length: (decoded: Dec) => Enc,
  // encode_with_length: (encoded: Enc) => EncLen
  // well, it field could be treated separately and encoded in Spec instead of in field

  decode(encoded: Enc): Dec
  interpret?: (decoded: Dec) => Interp
  translate?: (interpreted: Interp) => Dec
}

// FieldCondition indicates whether or not a field should be included
export interface FieldCondition {
  check: () => boolean
  register: (condition: boolean) => boolean
}

// TODO: maybe Enc should always be String or binary or something
export interface LengthCodec<Enc> {
  decode(encoded_length: Enc): number
  encode(length: number): Enc
  // encode: (encoded_value: Enc) => number
  // get_length(encoded_value: Enc): number
  // encode_with_length(encoded_value): Enc
  // encode: (encoded_value: String) => Enc
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
  // public length: number | LengthCodec<any>
  public length: number | LengthCodec<Enc> // should match Enc of FieldCodec
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

  // TODO: should Enc actually be a new type EncLen? Or should length be encoded in Spec
  // since the encoding of the length may be different
  // than the encoding of the field
  encode(decoded: Dec): Enc {
    let provided_length = Int.is_int(this.length) ? this.length : undefined
    return this.type.encode(decoded, provided_length)
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
