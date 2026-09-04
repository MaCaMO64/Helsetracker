// Lag SHA-256-hasher for tilgangslista, så e-postadresser ikke havner i
// JavaScript-koden som sendes til nettleseren.
//
// Bruk:
//   node scripts/hash-epost.mjs din@epost.no familiemedlem@epost.no
//
// Lim resultatet inn som miljøvariabel VITE_TILLATT_EPOST_HASH i Vercel
// (Type: Config) og i .env.local. Fjern gamle VITE_TILLATT_EPOST etterpå.

import { createHash } from 'node:crypto'

const eposter = process.argv.slice(2).flatMap((a) => a.split(',')).map((e) => e.trim()).filter(Boolean)

if (eposter.length === 0) {
  console.error('Oppgi minst én e-postadresse:\n  node scripts/hash-epost.mjs din@epost.no [flere ...]')
  process.exit(2)
}

const hasher = eposter.map((e) => {
  const normalisert = e.toLowerCase()
  const hash = createHash('sha256').update(normalisert).digest('hex')
  return { normalisert, hash }
})

console.log('\nNormalisert e-post           →  SHA-256')
for (const { normalisert, hash } of hasher) {
  console.log(`  ${normalisert.padEnd(28)} ${hash}`)
}

console.log('\nSett denne i Vercel (Type: Config) og i .env.local:\n')
console.log(`VITE_TILLATT_EPOST_HASH=${hasher.map((h) => h.hash).join(',')}\n`)
console.log('Husk å FJERNE VITE_TILLATT_EPOST (klartekst) og redeploye etterpå.\n')
