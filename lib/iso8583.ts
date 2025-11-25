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
  // https://www.typescriptlang.org/docs/handbook/2/classes.html#this-parameters
  // https://www.typescriptlang.org/docs/handbook/2/generics.html#using-class-types-in-generics
  static unpack<T extends Spec>(this: new () => T, data: string): Decoded<T> {
    const unpacked: RecordOf<Decoded<T>> = {}
    const template = new this()
    let index = 0

    for (let entry of Object.entries(template)) {
      const [name, field] = entry
      unpacked[name] = field.decode(data.slice(index, index + field.length))
      index += field.length
    }

    return unpacked as Decoded<T>
  } 
}

// Start easy by using ASCII encoding
export class AsciiMessage extends Spec {
  message_type_indicator = Field.new({
    length: 4,
    type: AsciiString.new()
  })

  static new = (...args: ConstructorParameters<typeof AsciiMessage>) => new AsciiMessage(...args)
}
let type_check_1: Decoded<AsciiMessage> = AsciiMessage.unpack("")
let type_check_2: {message_type_indicator: string} = AsciiMessage.unpack("")