import { useMemo, useState, type ChangeEvent } from 'react'
import { useLabResultater, useLagreLabResultater, useSlettLabResultat } from '../lib/db'
import { finnProvedato, parseLabTekst, type LabUttrekk } from '../lib/blodprove'
import { lesPdfTekst } from '../lib/pdf'
import { lesBlodproveBilde } from '../lib/blodproveKlient'
import { hentAiNokkel } from '../lib/aiNokkel'
import { iDag, leggTilDager, formaterDatoKort } from '../lib/dates'
import { SideTittel, Card, Button, TomTilstand, feltKlasse } from '../components/ui'

interface Utkast {
  dato: string
  kilde: string
  rader: LabUttrekk[]
}

function filTilDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(new Error('Klarte ikke å lese fila'))
    r.readAsDataURL(file)
  })
}

export function ProverPage() {
  const til = iDag()
  const fra = leggTilDager(til, -365)
  const { data: resultater = [] } = useLabResultater(fra, til)
  const lagre = useLagreLabResultater()
  const slett = useSlettLabResultat()

  const [utkast, setUtkast] = useState<Utkast | null>(null)
  const [ventendeBilde, setVentendeBilde] = useState<string | null>(null)
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function håndterFil(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // tillat samme fil på nytt
    if (!file) return
    setFeil(null)
    setInfo(null)
    setUtkast(null)
    setVentendeBilde(null)

    const erPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (erPdf) {
      setLaster(true)
      try {
        const tekst = await lesPdfTekst(file)
        const rader = parseLabTekst(tekst)
        if (rader.length === 0) {
          setFeil(
            'Fant ingen verdier i PDF-en. Er det en bilde-/skannet PDF? Ta i så fall et skjermbilde og last det opp som bilde.',
          )
        } else {
          setUtkast({ dato: finnProvedato(tekst) ?? iDag(), kilde: 'pdf', rader })
          setInfo(`Fant ${rader.length} verdier lokalt (ingen data sendt ut).`)
        }
      } catch {
        setFeil('Klarte ikke å lese PDF-en.')
      } finally {
        setLaster(false)
      }
    } else if (file.type.startsWith('image/')) {
      try {
        setVentendeBilde(await filTilDataUrl(file))
      } catch {
        setFeil('Klarte ikke å lese bildet.')
      }
    } else {
      setFeil('Last opp en PDF eller et bilde.')
    }
  }

  async function tolkBildeMedAi() {
    if (!ventendeBilde) return
    setLaster(true)
    setFeil(null)
    try {
      const res = await lesBlodproveBilde([ventendeBilde])
      if (res.verdier.length === 0) setFeil('AI-en fant ingen verdier i bildet.')
      else {
        setUtkast({ dato: res.dato ?? iDag(), kilde: 'bilde', rader: res.verdier })
        setInfo(`AI-en leste ${res.verdier.length} verdier.`)
      }
      setVentendeBilde(null)
    } catch (e) {
      setFeil((e as Error).message)
    } finally {
      setLaster(false)
    }
  }

  function endreRad(i: number, endring: Partial<LabUttrekk>) {
    if (!utkast) return
    setUtkast({ ...utkast, rader: utkast.rader.map((r, j) => (j === i ? { ...r, ...endring } : r)) })
  }
  function fjernRad(i: number) {
    if (!utkast) return
    setUtkast({ ...utkast, rader: utkast.rader.filter((_, j) => j !== i) })
  }

  async function lagreUtkast() {
    if (!utkast) return
    const gyldige = utkast.rader.filter((r) => r.analyse.trim() && Number.isFinite(r.verdi))
    if (gyldige.length === 0) return
    await lagre.mutateAsync(
      gyldige.map((r) => ({
        dato: utkast.dato,
        analyse: r.analyse.trim(),
        analyse_kanon: r.analyse_kanon ?? null,
        verdi: r.verdi,
        enhet: r.enhet ?? null,
        ref_lav: r.ref_lav ?? null,
        ref_hoy: r.ref_hoy ?? null,
        kilde: utkast.kilde,
      })),
    )
    setUtkast(null)
    setInfo(`Lagret ${gyldige.length} verdier.`)
  }

  const perDato = useMemo(() => {
    const kart = new Map<string, typeof resultater>()
    for (const r of resultater) {
      if (!kart.has(r.dato)) kart.set(r.dato, [])
      kart.get(r.dato)!.push(r)
    }
    return [...kart.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [resultater])

  const harAiNokkel = hentAiNokkel().length > 0

  return (
    <div className="space-y-4">
      <SideTittel tittel="Blodprøver" undertittel="Importer fra Fürst / Helsenorge" />

      {/* Import */}
      <Card className="p-5">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Last opp PDF eller skjermbilde
        </label>
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={håndterFil}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <p className="mt-2 text-xs text-slate-400">
          PDF med tekst leses lokalt på enheten. Skjermbilder tolkes av AI – da spør vi om
          samtykke først.
        </p>
        {laster && <p className="mt-2 text-sm text-slate-500">Leser …</p>}
        {feil && <p className="mt-2 text-sm text-red-600">{feil}</p>}
        {info && !feil && <p className="mt-2 text-sm text-teal-700">{info}</p>}

        {/* Samtykke før AI-tolkning av bilde */}
        {ventendeBilde && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Sende bildet til AI for tolkning?</p>
            <p className="mt-1 text-xs">
              Bildet av blodprøvesvaret sendes til AI-leverandøren din for å lese av verdiene.
              Dette er helsedata – fortsett kun hvis du er komfortabel med det.
            </p>
            {!harAiNokkel && (
              <p className="mt-1 text-xs text-red-700">
                Du mangler AI-nøkkel. Legg den inn i Innstillinger → Bildeimport først.
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <Button onClick={tolkBildeMedAi} disabled={laster || !harAiNokkel}>
                Ja, tolk bildet
              </Button>
              <Button variant="secondary" onClick={() => setVentendeBilde(null)}>
                Avbryt
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Forhåndsvisning / redigering */}
      {utkast && (
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Kontroller verdiene</h2>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Prøvedato</span>
            <input
              type="date"
              value={utkast.dato}
              onChange={(e) => setUtkast({ ...utkast, dato: e.target.value })}
              className={feltKlasse}
            />
          </label>
          <div className="space-y-2">
            {utkast.rader.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                <input
                  value={r.analyse}
                  onChange={(e) => endreRad(i, { analyse: e.target.value })}
                  placeholder="Analyse"
                  className={`${feltKlasse} min-w-28 flex-1`}
                />
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(r.verdi) ? r.verdi : ''}
                  onChange={(e) => endreRad(i, { verdi: Number(e.target.value) })}
                  placeholder="Verdi"
                  className={`${feltKlasse} w-20`}
                />
                <input
                  value={r.enhet ?? ''}
                  onChange={(e) => endreRad(i, { enhet: e.target.value })}
                  placeholder="Enhet"
                  className={`${feltKlasse} w-24`}
                />
                <button
                  onClick={() => fjernRad(i)}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Fjern rad"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={lagreUtkast} disabled={lagre.isPending}>
              {lagre.isPending ? 'Lagrer …' : 'Lagre verdier'}
            </Button>
            <Button variant="secondary" onClick={() => setUtkast(null)}>
              Avbryt
            </Button>
          </div>
        </Card>
      )}

      {/* Lagrede prøver */}
      {perDato.length === 0 ? (
        <TomTilstand
          ikon="🩸"
          tittel="Ingen blodprøver ennå"
          tekst="Last opp et prøvesvar over, så dukker verdiene opp her og som kurver i Analyse."
        />
      ) : (
        perDato.map(([dato, rader]) => (
          <Card key={dato} className="p-4">
            <div className="mb-2 font-semibold text-slate-800">{formaterDatoKort(dato)}</div>
            <div className="space-y-1.5 text-sm">
              {rader.map((r) => {
                const utenfor =
                  (r.ref_lav != null && r.verdi < r.ref_lav) ||
                  (r.ref_hoy != null && r.verdi > r.ref_hoy)
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">{r.analyse}</span>
                    <span className="flex items-center gap-2">
                      <span className={utenfor ? 'font-semibold text-red-600' : 'text-slate-800'}>
                        {r.verdi} {r.enhet ?? ''}
                      </span>
                      {(r.ref_lav != null || r.ref_hoy != null) && (
                        <span className="text-xs text-slate-400">
                          ({r.ref_lav ?? ''}–{r.ref_hoy ?? ''})
                        </span>
                      )}
                      <button
                        onClick={() => slett.mutate(r.id)}
                        className="text-slate-300 hover:text-red-500"
                        aria-label="Slett"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
