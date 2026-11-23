# File: `.nvmrc`

**What it is:** One line: `22`. It tells Node Version Manager which Node.js
version this project wants.

**Why it exists:** Different Node versions can break native modules
(we hit exactly this with the SQLite library). With `.nvmrc`, typing
`nvm use` picks the right version automatically.
