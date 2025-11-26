# interchange

Declarative ISO 8583 codec!

some goals and ideas:
- staged parsing
  - permissive parsing of fields into data (e.g. issuer parsing messages from acquirers)
  - stricter parsing of data into values
    - errors can be unpacked for raw data
    - ideally, does not throw errors
  - incremental parsing?
- abstractions for creating iso8583 are strict
- typesafe. reach goal: type narrowing based on bitmaps and field values