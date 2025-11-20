import ebcdic_code_page_data from '../lib/ebcdic.json'
import ebcdic_invariant_data from '../lib/ebcdic_invariant_set.json'

let invariant_set = ebcdic_invariant_data.slice(1).map(row => row[2]!)
let invariant_ebcdic = ebcdic_code_page_data.slice(2).filter(row => invariant_set.includes(row[2]!))
// let alphanumeric_ebcdic = ebcdic_code_page_data.slice(2).filter(row => /^[0-9a-zA-Z]$/.test(row[2]!))

// let intToChar = invariant_ebcdic.map((row) => [parseInt(row[0]!)!, row[2]!] as const).reduce((hash, pair) => {
//   hash[pair[0]] = pair[1]
//   return hash
// }, {} as Record<number, string>)
let mapIter = invariant_ebcdic.map((row) => [parseInt(row[0]!)!, row[2]!] as const)

console.log(JSON.stringify(mapIter))