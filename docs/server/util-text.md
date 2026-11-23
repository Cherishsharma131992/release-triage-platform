# File: `server/src/util/text.ts`

**What it is:** Text utilities: `sha1` for hashing, a tokenizer that removes
filler words and stems endings (failing→fail), and `textSimilarity` — a
cosine-similarity score between two texts in [0,1].

**Why it exists:** Jira matching and fingerprinting need to say "these two
error messages are basically the same" numerically.
