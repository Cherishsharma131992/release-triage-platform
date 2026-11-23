# `server/test/fingerprint.test.ts`

Checks that fingerprints are stable: the same logical error produces the same
fingerprint even when timestamps/paths/ports differ, and different errors
produce different fingerprints.
