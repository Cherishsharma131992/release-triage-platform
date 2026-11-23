# File: `package-lock.json`

**What it is:** A giant auto-generated list recording the *exact* version of
every npm package installed (including packages' own dependencies).

**Why it exists:** `npm install` on your machine then installs the identical
set of packages everyone else uses — no "works on my machine" surprises.

**Should you edit it?** Never by hand. `npm install` maintains it.
