// Notes on ISO8583
//
// ISO defines the fields, but encoding is up to specific spec you are implementing.
// Some, like Visa, use a binary encoding: a binary bitmap, binary uint for length, binary BCD for MTI, and EBCDIC for (most) alphanumerics.
// Some use ASCII: the bitmap is represented as hex encoded in ASCII, length as ASCII number, etc..
// https://j8583.sourceforge.net/desc8583en.html
//
// number of Ls in LLVAR and LLLVAR indicate the range of decimal digits that the variable length supports. Binary encoding is more compact,
// so LL = 1 byte (2 packed unsigned BCD) and LLL = 2 byte (3 packed unsigned BCD + 1 padding nibble of 0x0)
// whereas in ASCII: LL = 2 bytes (2 ASCII numerals), LLL = 3 bytes (3 ASCII numerals)

import { ParseError } from "./errors"
import { Int } from './interval'
import type { FieldCodec, LengthCodec, FieldCondition } from './field'
import { Field } from './field'


class AsciiNumber implements FieldCodec<string, number> {
  static new = (...args: ConstructorParameters<typeof AsciiNumber>) => new AsciiNumber(...args)

  encode(decoded: number, length?: number) {
    let encoded = decoded.toString()
    return encoded.padStart(length || encoded.length, '0')
  }
  decode = (encoded: string) => parseInt(encoded)
}

class AsciiString implements FieldCodec<string, string> {
  static new = (...args: ConstructorParameters<typeof AsciiString>) => new AsciiString(...args)
  encode = (decoded: string, length: number) => decoded.slice(0, length)
  decode = (encoded: string) => encoded
}

class AsciiVariableLength implements LengthCodec<string> {
  constructor(public size: number) {}
  static new = (size: number) => new AsciiVariableLength(size)

  decode(encoded: string) {
    return parseInt(encoded)
  }
  encode(length: number) {
    // TODO: validate size?
    return length.toString().padStart(this.size, '0')
  }
}

class AsciiLLVAR {
  static new = () => new AsciiVariableLength(2)
}

type NullableIfConditional<C, T> = C extends FieldCondition ? T | null : T

type Decoded<T> = {
  [K in keyof T]: T[K] extends Field<any, any, any, infer Cond> ?
    NullableIfConditional<Cond, ReturnType<T[K]['type']['decode']>> :
    never
};

// TODO: make types optional, not just never or undefined
// requires splitting into to types, making the nullable ones mapped with +?
// then merging
type Compact<T> = {
  [K in keyof T]: null extends T[K] ? never : T[K]
}

type RecordOf<T> = Record<string, T[keyof T]>

class Spec {
  static _singleton: any
  static get_singleton<T extends Spec>(this: typeof Spec & (new () => T)): T {
    return (this._singleton as T) ||= new this()
  }

  // https://www.typescriptlang.org/docs/handbook/2/classes.html#this-parameters
  // https://www.typescriptlang.org/docs/handbook/2/generics.html#using-class-types-in-generics
  static unpack<T extends Spec>(this: typeof Spec & (new () => T), data: string): Decoded<T> {
    const unpacked: RecordOf<Decoded<T>> = {}
    const klass = this.get_singleton()
    let index = 0

    for (let entry of Object.entries(klass)) {
      const [name, field]: [string, Field<any, any, any>] = entry

      if (field.condition?.check() ?? true) {
        let field_length

        if (Int.is_int(field.length)) {
          field_length = field.length
        } else {
          field_length = field.length.decode(data.slice(index, index + field.length.size))
          index += field.length.size
        }
        let raw = data.slice(index, index + field_length)
        // unpacked[name] = { raw: raw, value: field.decode(raw) }
        unpacked[name] = field.decode(raw)
        index += field_length
      }
    }

    return unpacked as Decoded<T>
  }

  // TODO: change Enc type to string or buffer?
  // technically that is already true in unpack() but the types pass because
  // its untyped
  static pack<T extends Spec>(
    this: typeof Spec & (new () => T),
    params: Decoded<T>
  ): string {
    const klass = this.get_singleton()
    const strings = []

    for (let entry of Object.entries(klass)) {
      const [name, field]: [string, Field<any, any, any>] = entry
      if (name in params && params[name as keyof T] != null) {
        field.condition?.register(true)
        console.log(name, params[name as keyof T])
      }
    }

    for (let entry of Object.entries(klass)) {
      const [name, field]: [string, Field<any, any, any>] = entry
      if (name in params && params[name as keyof T] != null) {
        // This won't work for bitmaps, which are stateful. The value is stored
        // on the field instance itself (also means we might not want a singleton).
        let encoded = field.encode(params[name as keyof Decoded<T>])

        if (!Int.is_int(field.length)) {
          let encoded_length = field.length.encode(encoded.length)
          strings.push(encoded_length)
        }

        strings.push(encoded)
      }
    }

    return strings.join('')
  }
}

class List<T> {
  constructor(public arr: T[]) {}
  static new = <T>(arr: T[]) => new List(arr)

  each_cons(size: number): T[][] {
    return this.arr.reduce((result, item, index) => {
      if (index % size === 0) {
        result.push([])
      }
      result[result.length - 1]!.push(item)
      return result
    }, [] as T[][])
  }
}

export class Bitmap {
  constructor(public bools: boolean[]) {}
  static new = (bools: boolean[]) => new Bitmap(bools)

  // These are methods not anonymous functions so that Bitmap equality works as expected.
  // TODO: change most arrow functions to methods in classes
  at(index: number) {
    return this.bools[index]
  }
  set(index: number, value: boolean) {
    return this.bools[index] = value
  }

  to_bytes(): Uint8Array {
    return Uint8Array.from(List.new(this.bools).each_cons(8).reduce((bytes, cons) => {
      let byte = 0
      for (let bit of cons) {
        byte <<= 1
        byte |= bit ? 1 : 0
      }
      bytes.push(byte)
      return bytes
    }, [] as Array<number>))
  }

  static from_bytes(bytes: Uint8Array): Bitmap {
    const bools = []
    for (let byte of bytes) {
      for (let i = 0; i < 8; i++) {
        bools.push((byte & 0x80) !== 0)
        byte <<= 1
      }
    }
    return Bitmap.new(bools)
  }
}

class BitmapCondition implements FieldCondition {
  constructor(public index: number, public codec: HexBitmap) { }

  check = () => this.codec.bitmap.at(this.index) || false
  register = (condition: boolean) => {
    console.log(this.index)
    console.log(this.codec.bitmap)
    return this.codec.bitmap.set(this.index, condition)
  }
}

class HexBitmap implements FieldCodec<string, Bitmap> {
  public bitmap: Bitmap = Bitmap.new([])
  static new = () => new HexBitmap()

  // TODO: use the stateful decoded bitmap
  encode(decoded: Bitmap, _length?: number) {
    console.log(decoded.to_bytes().toHex().toUpperCase())
    return decoded.to_bytes().toHex().toUpperCase()
  }
  decode(encoded: string) {
    return this.bitmap = Bitmap.from_bytes(Uint8Array.fromHex(encoded))
  }

  // TODO: call the condition when encoding?
  // TODO: validate unique index?
  at = (index: number): BitmapCondition => new BitmapCondition(index, this)

  // TOOD: the field number will look weird once we have a secondary bitmap (since indexing starts over).
  // maybe it is smart and can figure out when the index is out of range and modulo to the right bitmap offset?
  // ideally bitmap will have the length stored. right now it's stored in the field.
  // TODO: should the length be an instance variable on the codec?
  field = (field_number: number) => this.at(field_number - 1)
}

// Start easy by using ASCII encoding
// TODO: add graceful error handling / partial parsing
export class AsciiMessage extends Spec {
  // TODO: replace Field.new with a DSL function?
  // or could invoke InstanceOf for me instead of .new()
  message_type_indicator = Field.new({
    length: 4,
    type: AsciiString.new()
  })

  // problem: when creating an ascii message, bitmap needs to be aware of other fields
  primary_bitmap = Field.new({
    length: 16,
    type: HexBitmap.new()
  })

  // interpretation -> value -> data: sets index of primary bitmap
  // data -> value -> interpretation: gets index of primary bitmap
  secondary_bitmap = Field.new({
    condition: this.primary_bitmap.type.at(0),
    length: 16,
    type: HexBitmap.new()
  })

  primary_account_number = Field.new({
    condition: this.primary_bitmap.type.field(2),
    // TODO: Field.new could call .new() or new or constructor for you
    length: AsciiLLVAR.new(),
    type: AsciiString.new()
  })

  processing_code = Field.new({
    condition: this.primary_bitmap.type.field(3),
    length: 6,
    type: AsciiNumber.new()
  })

  transaction_amount = Field.new({
    condition: this.primary_bitmap.type.field(4),
    length: 12,
    type: AsciiNumber.new()
  })

  settlement_amount = Field.new({
    condition: this.primary_bitmap.type.field(5),
    length: 12,
    type: AsciiNumber.new()
  })

  cardholder_billing_amount = Field.new({
    condition: this.primary_bitmap.type.field(6),
    length: 12,
    type: AsciiNumber.new()
  })

  transmission_datetime = Field.new({
    condition: this.primary_bitmap.type.field(7),
    length: 10,
    // TODO: make a datetime
    type: AsciiNumber.new()
  })

  cardholder_billing_fee_amount = Field.new({
    condition: this.primary_bitmap.type.field(8),
    length: 8,
    // TODO: make a datetime
    type: AsciiNumber.new()
  })

  static new = (...args: ConstructorParameters<typeof AsciiMessage>) => new AsciiMessage(...args)
}
const _type_check: Prettify<Decoded<AsciiMessage>> = AsciiMessage.unpack("")

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
