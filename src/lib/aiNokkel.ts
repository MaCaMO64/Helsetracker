// BYO AI-nøkkel for bildeimport (blodprøve-skjermbilder). Lagres KUN lokalt på
// enheten (localStorage) – aldri i databasen vår. Brukes bare når brukeren
// eksplisitt velger AI-tolkning av et bilde.

const NOKKEL = 'helsetracker:ai-nokkel:v1'

export function hentAiNokkel(): string {
  try {
    return localStorage.getItem(NOKKEL) ?? ''
  } catch {
    return ''
  }
}

export function settAiNokkel(verdi: string): void {
  try {
    localStorage.setItem(NOKKEL, verdi.trim())
  } catch {
    /* ignorer */
  }
}
