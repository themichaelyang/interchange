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

// 1. data -> value (decode, unpack)
// 2. value -> data (encode, pack)
// 3. value -> interpretation (interpret)
// 4. interpretation -> value (translate)



// class BCD implements FieldCodec<Bytes, number> {
//   encode: (decoded: number) => {

//   }
//   decode: (encoded: Bytes) => {

//   }
// }

class AsciiNumber implements FieldCodec<string, number> {
  static new = (...args: ConstructorParameters<typeof AsciiNumber>) => new AsciiNumber(...args)

  encode = (decoded: number, length: number) => decoded.toString().padStart(length, '0')
  decode = (encoded: string) => parseInt(encoded)
}

class AsciiString implements FieldCodec<string, string> {
  static new = (...args: ConstructorParameters<typeof AsciiString>) => new AsciiString(...args)
  encode = (decoded: string, length: number) => decoded.slice(0, length)
  decode = (encoded: string) => encoded
}
// enum MessageTypeIndicatorVersion {
//   ISO_8583_1987 = "ISO_8583_1987",
//   ISO_8583_1993 = "ISO_8583_1993",
//   ISO_8583_2003 = "ISO_8583_2003",
//   Reserved = "Reserved",
//   NationalUse = "NationalUse",
//   PrivateUse = "PrivateUse"
// }

// namespace MessageTypeIndicatorVersion {
//   export const from_s = (str: string): MessageTypeIndicatorVersion => {
//     if (str == "0") return MessageTypeIndicatorVersion.ISO_8583_1987
//     else if (str == "1") return MessageTypeIndicatorVersion.ISO_8583_1993
//     else if (str == "2") return MessageTypeIndicatorVersion.ISO_8583_2003
//     else if (str == "3" || str == "4" || str == "5" || str == "6" || str == "7")
//       return MessageTypeIndicatorVersion.Reserved
//     else if (str == "8") return MessageTypeIndicatorVersion.NationalUse
//     else if (str == "9") return MessageTypeIndicatorVersion.PrivateUse
//     else throw Error("Invalid message type indicator version")
//   }
// }

class MessageTypeIndicator {
  constructor(
    public version: MessageTypeIndicator.Version,
    public message_class: string,
    public message_function: string,
    public message_origin: string
  ) {}

  static new = (version: MessageTypeIndicator.Version, message_class: string, message_function: string, message_origin: string) => new MessageTypeIndicator(version, message_class, message_function, message_origin)
  static from_s = (str: string): MessageTypeIndicator => {
    if (str.length !== 4) throw Error("Message type indicator must be 4 characters long")
    const [version_digit, message_class_digit, message_function_digit, message_origin_digit] = str.split('') as [string, string, string, string]

    return MessageTypeIndicator.new(
      MessageTypeIndicator.Version.from_s(version_digit),
      message_class_digit,
      message_function_digit,
      message_origin_digit
    )
  }
  to_s = () => ""
}

namespace MessageTypeIndicator {
  type Versions = "ISO 8583:1987" | "ISO 8583:1993" | "ISO 8583:2003" | "Reserved" | "National use" | "Private use"

  export class Version {
    constructor(public version: Versions, public value: string) {}
    static new = (version: Versions, value: string) => new Version(version, value)

    static from_s = (str: string): Version => {
      if (str == "0") return Version.new("ISO 8583:1987", "0")
      else if (str == "1") return Version.new("ISO 8583:1993", "1")
      else if (str == "2") return Version.new("ISO 8583:2003", "2")
      else if (str == "3" || str == "4" || str == "5" || str == "6" || str == "7")
        return Version.new("Reserved", str)
      else if (str == "8") return Version.new("National use", "8")
      else if (str == "9") return Version.new("Private use", "9")
      // TODO: return instead of throw!
      else throw ParseError.new("Invalid message type indicator version")
    }
  }

  // export class MessageClass {
  //   constructor(public message_class: string) {}
  //   static new = (message_class: string) => new MessageClass(message_class)
  // }
}

class AsciiMessageTypeIndicator implements FieldCodec<string, string, MessageTypeIndicator> {
  encode = AsciiString.prototype.encode
  decode = AsciiString.prototype.decode

  interpret = (decoded: string): MessageTypeIndicator => MessageTypeIndicator.from_s(decoded)
  translate = (interpreted: MessageTypeIndicator): string => interpreted.to_s()
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

// Two steps are:
// 1. unpack
// 2. into domain object

type Decoded<T> = {
  [K in keyof T]: T[K] extends Field<any, any> ? ReturnType<T[K]['type']['decode']> : never
};

type RecordOf<T> = Record<string, T[keyof T]>

// type Fields<T> = {
//   [K in keyof T]: T[K] extends Function ? never : K
// };

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
      const [name, field]: [string, Field<any, any>] = entry

      if (field.condition?.check() ?? true) {
        let field_length

        if (Int.is_int(field.length)) {
          field_length = field.length
        } else {
          field_length = field.length.decode(data.slice(index, index + field.length.size))
          index += field.length.size
        }
        unpacked[name] = field.decode(data.slice(index, index + field_length))
        index += field_length
      }
    }

    return unpacked as Decoded<T>
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
    return List.new(this.bools).each_cons(8).reduce((bytes, cons) => {
      let byte = 0
      for (let bit of cons) {
        byte <<= 1
        byte |= bit ? 0x80 : 0x00
      }
      bytes[bytes.length] = byte
      return bytes
    }, Uint8Array.from([]))
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
  constructor(public index: number, public codec: HexBitmap) {}

  check = () => this.codec.bitmap.at(this.index) || false
  register = (condition: boolean) => this.codec.bitmap.set(this.index, condition)
}

class HexBitmap implements FieldCodec<string, Bitmap> {
  public bitmap: Bitmap = Bitmap.new([])
  static new = () => new HexBitmap()

  // TODO: use the stateful decoded bitmap
  encode = (decoded: Bitmap, length: number) => {
    return decoded.to_bytes().toHex()
  }
  decode = (encoded: string) => {
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

  transaction_amount = Field.new({
    condition: this.primary_bitmap.type.field(4),
    length: 12,
    type: AsciiNumber.new()
  })

  static new = (...args: ConstructorParameters<typeof AsciiMessage>) => new AsciiMessage(...args)
}
const _type_check: Decoded<AsciiMessage> = AsciiMessage.unpack("")
