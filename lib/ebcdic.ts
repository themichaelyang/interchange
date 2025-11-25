import { ParseError } from "./parse_error";

// https://www.ibm.com/docs/en/i/7.1.0?topic=sets-invariant-character-set
// http://www.bitsavers.org/pdf/ibm/370/referenceCard/GX20-1850-7_System_370_Reference_Summary_Feb89.pdf
// https://www.astrodigital.org/digital/ebcdic.html
// https://en.wikipedia.org/wiki/Code_page#EBCDIC-based_code_pages

class Dict<K, V> extends Map<K, V> {
  static new = (iter?: any) => new Dict(iter)
}

// invariant set
// ebcdic = extended bcd interchange code
// so, numbers are unpacked BCD
const from_ebcdic = Dict.new([
  [64, " "], // not listed in the invariant set but should be ok
  [75, "."],
  [76, "<"],
  [77, "("],
  [78, "+"],
  [92, "*"],
  [93, ")"],
  [94, ";"],
  [96, "-"],
  [97, "/"],
  [107, ","],
  [108, "%"],
  [109, "_"],
  [110, ">"],
  [111, "?"],
  [122, ":"],
  [125, "'"],
  [126, "="],
  [127, "\""],
  [129, "a"],
  [130, "b"],
  [131, "c"],
  [132, "d"],
  [133, "e"],
  [134, "f"],
  [135, "g"],
  [136, "h"],
  [137, "i"],
  [145, "j"],
  [146, "k"],
  [147, "l"],
  [148, "m"],
  [149, "n"],
  [150, "o"],
  [151, "p"],
  [152, "q"],
  [153, "r"],
  [162, "s"],
  [163, "t"],
  [164, "u"],
  [165, "v"],
  [166, "w"],
  [167, "x"],
  [168, "y"],
  [169, "z"],
  [193, "A"],
  [194, "B"],
  [195, "C"],
  [196, "D"],
  [197, "E"],
  [198, "F"],
  [199, "G"],
  [200, "H"],
  [201, "I"],
  [209, "J"],
  [210, "K"],
  [211, "L"],
  [212, "M"],
  [213, "N"],
  [214, "O"],
  [215, "P"],
  [216, "Q"],
  [217, "R"],
  [226, "S"],
  [227, "T"],
  [228, "U"],
  [229, "V"],
  [230, "W"],
  [231, "X"],
  [232, "Y"],
  [233, "Z"],
  [240, "0"],
  [241, "1"],
  [242, "2"],
  [243, "3"],
  [244, "4"],
  [245, "5"],
  [246, "6"],
  [247, "7"],
  [248, "8"],
  [249, "9"]
]) as Dict<number, string>

function invert_dict<K, V>(hash: Dict<K, V>): Dict<V, K> {
  return hash.entries().reduce((inverted, entry) => {
    inverted.set(entry[1], entry[0])
    return inverted
  }, Dict.new() as Dict<V, K>)
}

const to_ebcdic = invert_dict(from_ebcdic)

// be careful with bit padding...
export function parse_alphanumeric_ebcdic(ebcdic_data: Uint8Array) {
  let str: string[] = []
  let error
  ebcdic_data.forEach((byte, i) => {
    let char = from_ebcdic.get(byte)

    if (is_undefined(char)) {
      error = ParseError.new('not valid ebcdic')
      char = ' '
    }

    str[i] = char
  })
  
  // One idea: return the attempted parse with error in a tuple?
  return str.join('')
}

function is_undefined(val: any): val is undefined {
  return val === undefined
}

export function ascii_to_ebcdic(ascii_str: string) {
  let error
  const ebcdic_array = Array.from(ascii_str).map(c => {
    let codepoint = to_ebcdic.get(c)
    console.log(codepoint)

    if (is_undefined(codepoint)) {
      error = ParseError.new('input must be alphanumeric')
      codepoint = 0
    }

    return codepoint
  })

  if (error) return error

  return ebcdic_array
}
