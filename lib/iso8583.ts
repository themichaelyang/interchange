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

class Bytes extends Uint8Array {

}

// 1. data -> value (decode, unpack)
// 2. value -> data (encode, pack)
// 3. value -> interpretation (interpret)
// 4. interpretation -> value (translate)
interface FieldCodec<E, D, I=D> {
  encode: (decoded: D, length: number) => E,
  decode: (encoded: E, length: number) => D
  interpret?: (decoded: D) => I
  translate?: (interpreted: I) => D
}

// class BCD implements FieldCodec<Bytes, number> {
//   encode: (decoded: number) => {

//   }
//   decode: (encoded: Bytes) => {

//   }
// }

class AsciiNumber implements FieldCodec<string, number> {
  static new = (...args: ConstructorParameters<typeof AsciiNumber>) => new AsciiNumber(...args)

  encode = (decoded: number, length: number) => decoded.toString().padStart(length, '0')
  decode = (encoded: string, _length: number) => parseInt(encoded)
}

class AsciiString implements FieldCodec<string, string> {
  static new = (...args: ConstructorParameters<typeof AsciiString>) => new AsciiString(...args)
  encode = (decoded: string, length: number) => decoded.slice(0, length)
  decode = (encoded: string, _length: number) => encoded
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

// Two steps are:
// 1. unpack
// 2. into domain object
class Field<E, D> {
  public length
  public type: FieldCodec<E, D>
  
  constructor({length, type}: {
    length: number, 
    type: FieldCodec<E, D>
  }) {
    this.length = length
    this.type = type
  }

  decode = (encoded: E): D => this.type.decode(encoded, this.length)
  static new = <E, D>(...args: ConstructorParameters<typeof Field<E, D>>) => new Field(...args)
}

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
  static unpack<T extends Spec>(this: new () => T, data: string): Decoded<T> {
    const unpacked: RecordOf<Decoded<T>> = {}
    const klass = new this()
    let index = 0

    for (let entry of Object.entries(klass)) {
      const [name, field] = entry
      unpacked[name] = field.decode(data.slice(index, index + field.length))
      index += field.length
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

class HexBitmap implements FieldCodec<string, Bitmap> {
  public bitmap: Bitmap = Bitmap.new([])
  static new = () => new HexBitmap()

  // TODO: use the stateful decoded bitmap
  encode = (decoded: Bitmap, length: number) => {
    return decoded.to_bytes().toHex()
  }
  decode = (encoded: string, _length: number) => {
    return this.bitmap = Bitmap.from_bytes(Uint8Array.fromHex(encoded))
  }
}

// Start easy by using ASCII encoding
// TODO: add graceful error handling / partial parsing
export class AsciiMessage extends Spec { 
  message_type_indicator = Field.new({
    length: 4,
    type: AsciiString.new()
  })

  // problem: when creating an ascii message, bitmap needs to be aware of other fields
  primary_bitmap = Field.new({
    length: 4,
    type: HexBitmap.new()
  })
  //   length: 4,
  //   type: HexBitmap.new()
  // })

  static new = (...args: ConstructorParameters<typeof AsciiMessage>) => new AsciiMessage(...args)
}
const _type_check: Decoded<AsciiMessage> = AsciiMessage.unpack("")