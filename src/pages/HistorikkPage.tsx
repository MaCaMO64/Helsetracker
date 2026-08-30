import { useMemo, useState, type FormEvent } from 'react'
import {
  useDoserPeriode,
  useHendelser,
  useLagreHendelse,
  useMedisiner,
  useSlettHendelse,
  useSymptomer,
  useSymptomOppfPeriode,
  type HendelseInn,
} from '../lib/db'
import type { Hendelse } from '../lib/types'
import { formaterDatoKort, iDag, leggTilDager } from '../lib/dates'
import { SideTittel, Card, Button, Modal, TomTilstand, feltKlasse } from '../components/ui'

const DAGER = 30

const TYPE_IKON: Record<string, string> = { doseendring: '💊', legebesok: '🩺', notat: '📌' }
const TYPE_VALG = [
  { verdi: 'doseendring', navn: 'Doseendring' },
  { verdi: 'legebesok', navn: 'Legebesøk' },
  { verdi: 'notat', navn: 'Notat' },
]

export function HistorikkPage() {
  const til = iDag()
  const fra = leggTilDager(til, -(DAGER - 1))

  const { data: medisiner = [] } = useMedisiner()
  const { data: symptomer = [] } = useSymptomer()
  const { data: doser = [] } = useDoserPeriode(fra, til)
  const { data: oppforinger = [] } = useSymptomOppfPeriode(fra, til)
  const { data: hendelser = [] } = useHendelser(fra, til)
  const lagreHendelse = useLagreHendelse()
  const slettHendelse = useSlettHendelse()

  const [redigerer, setRedigerer] = useState<HendelseInn | null>(null)

  const medNavn = useMemo(() => new Map(medisiner.map((m) => [m.id, m])), [medisiner])
  const symNavn = useMemo(() => new Map(symptomer.map((s) => [s.id, s])), [symptomer])

  const perDato = useMemo(() => {
    const kart = new Map<
      string,
      { doser: typeof doser; symptomer: typeof oppforinger; hendelser: typeof hendelser }
    >()
    const sikre = (d: string) => {
      if (!kart.has(d)) kart.set(d, { doser: [], symptomer: [], hendelser: [] })
      return kart.get(d)!
    }
    for (const d of doser) sikre(d.dato).doser.push(d)
    for (const o of oppforinger) sikre(o.dato).symptomer.push(o)
    for (const h of hendelser) sikre(h.dato).hendelser.push(h)
    return [...kart.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [doser, oppforinger, hendelser])

  function lagreForm(e: FormEvent) {
    e.preventDefault()
    if (!redigerer || !redigerer.tittel.trim()) return
    lagreHendelse.mutate(
      { ...redigerer, tittel: redigerer.tittel.trim() },
      { onSuccess: () => setRedigerer(null) },
    )
  }

  const nyHendelse = () =>
    setRedigerer({ dato: iDag(), type: 'doseendring', tittel: '', notat: '' })

  return (
    <div className="space-y-4">
      <SideTittel
        tittel="Historikk"
        undertittel={`Siste ${DAGER} dager`}
        handling={
          <Button variant="secondary" onClick={nyHendelse}>
            + Hendelse
          </Button>
        }
      />

      {perDato.length === 0 ? (
        <TomTilstand
          ikon="📆"
          tittel="Ingen loggføringer ennå"
          tekst="Når du logger doser og symptomer på «I dag» – eller legger inn en hendelse – dukker det opp her."
          handling={<Button onClick={nyHendelse}>Legg til hendelse</Button>}
        />
      ) : (
        perDato.map(([d, innhold]) => (
          <Card key={d} className="p-4">
            <div className="mb-2 font-semibold text-slate-800">{formaterDatoKort(d)}</div>
            <div className="space-y-1.5 text-sm">
              {innhold.doser.map((dose) => (
                <div key={dose.id} className="flex justify-between gap-3 text-slate-600">
                  <span>
                    💊 {medNavn.get(dose.medication_id)?.navn ?? 'Ukjent'}
                    {dose.tidspunkt ? <span className="text-slate-400"> · {dose.tidspunkt}</span> : ''}
                  </span>
                  <span className="font-medium text-slate-800">
                    {dose.dose} {medNavn.get(dose.medication_id)?.enhet ?? ''}
                  </span>
                </div>
              ))}
              {innhold.symptomer.map((o) => {
                const s = symNavn.get(o.symptom_id)
                const ikon = s?.kategori === 'faktor' ? '🧭' : '🤒'
                const verdi = s?.skala_type === 'ja_nei' ? (o.verdi ? 'Ja' : 'Nei') : o.verdi
                return (
                  <div key={o.id} className="flex justify-between gap-3 text-slate-600">
                    <span>
                      {ikon} {s?.navn ?? 'Ukjent'}
                    </span>
                    <span className="font-medium text-slate-800">{verdi}</span>
                  </div>
                )
              })}
              {innhold.hendelser.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setRedigerer(tilForm(h))}
                    className="flex-1 text-left text-slate-600 hover:text-teal-700"
                  >
                    {TYPE_IKON[h.type] ?? '📌'} <span className="font-medium">{h.tittel}</span>
                    {h.notat ? <span className="text-slate-500"> – {h.notat}</span> : ''}
                  </button>
                  <button
                    onClick={() => slettHendelse.mutate(h.id)}
                    className="shrink-0 text-slate-300 hover:text-red-500"
                    aria-label="Slett hendelse"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Modal
        åpen={redigerer !== null}
        onClose={() => setRedigerer(null)}
        tittel={redigerer?.id ? 'Rediger hendelse' : 'Ny hendelse'}
      >
        {redigerer && (
          <form onSubmit={lagreForm} className="space-y-3">
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">Dato</span>
                <input
                  type="date"
                  className={feltKlasse}
                  value={redigerer.dato}
                  onChange={(e) => setRedigerer({ ...redigerer, dato: e.target.value })}
                />
              </label>
              <label className="block flex-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
                <select
                  className={feltKlasse}
                  value={redigerer.type ?? 'notat'}
                  onChange={(e) => setRedigerer({ ...redigerer, type: e.target.value })}
                >
                  {TYPE_VALG.map((t) => (
                    <option key={t.verdi} value={t.verdi}>
                      {t.navn}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tittel</span>
              <input
                autoFocus
                className={feltKlasse}
                value={redigerer.tittel}
                onChange={(e) => setRedigerer({ ...redigerer, tittel: e.target.value })}
                placeholder="f.eks. Økte Levaxin til 75 µg"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Notat (valgfritt)</span>
              <textarea
                className={feltKlasse}
                rows={2}
                value={redigerer.notat ?? ''}
                onChange={(e) => setRedigerer({ ...redigerer, notat: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setRedigerer(null)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={lagreHendelse.isPending || !redigerer.tittel.trim()}>
                {lagreHendelse.isPending ? 'Lagrer …' : 'Lagre'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function tilForm(h: Hendelse): HendelseInn {
  return { id: h.id, dato: h.dato, type: h.type, tittel: h.tittel, notat: h.notat }
}
