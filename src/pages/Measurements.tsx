import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { getMeasurements, saveMeasurement, deleteMeasurement } from '../storage';
import type { MeasurementEntry } from '../types';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';

type MeasurementField = keyof Omit<MeasurementEntry, 'id' | 'date' | 'notes'>;

const FIELDS: { key: MeasurementField; label: string }[] = [
  { key: 'chest', label: 'Rinta' },
  { key: 'shoulders', label: 'Hartiat' },
  { key: 'leftArm', label: 'Vasen käsivarsi' },
  { key: 'rightArm', label: 'Oikea käsivarsi' },
  { key: 'waist', label: 'Vyötärö' },
  { key: 'hips', label: 'Lantio' },
  { key: 'leftThigh', label: 'Vasen reisi' },
  { key: 'rightThigh', label: 'Oikea reisi' },
  { key: 'leftCalf', label: 'Vasen pohje' },
  { key: 'rightCalf', label: 'Oikea pohje' },
  { key: 'neck', label: 'Kaula' },
];

function getField(entry: MeasurementEntry, key: MeasurementField): number | undefined {
  return entry[key];
}

export default function Measurements() {
  const [entries, setEntries] = useState<MeasurementEntry[]>(() =>
    getMeasurements().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  );
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => {
    setEntries(
      getMeasurements().sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );
  };

  const handleSave = () => {
    const entry: MeasurementEntry = {
      id: uuid(),
      date,
      notes: notes || undefined,
    };

    let hasValue = false;
    for (const f of FIELDS) {
      const v = parseFloat(values[f.key] || '');
      if (v > 0) {
        entry[f.key] = v;
        hasValue = true;
      }
    }

    if (!hasValue) {
      alert('Syötä ainakin yksi mitta');
      return;
    }

    saveMeasurement(entry);
    setValues({});
    setNotes('');
    setShowForm(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Haluatko poistaa tämän merkinnän?')) return;
    deleteMeasurement(id);
    refresh();
  };

  const latest = entries[0];
  const earliest = entries.length >= 2 ? entries[entries.length - 1] : null;

  return (
    <div>
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Mitat
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Sulje' : '+ Uusi mittaus'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Uusi mittaus</h3>
          <div className="form-group">
            <label>Päivämäärä</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {FIELDS.map((f) => (
              <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                <label>{f.label} (cm)</label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  placeholder="—"
                  value={values[f.key] || ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="form-group mt-1">
            <label>Muistiinpanot</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="valinnainen"
            />
          </div>
          <div className="flex gap-sm">
            <button className="btn btn-primary" onClick={handleSave}>
              Tallenna
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Peruuta
            </button>
          </div>
        </div>
      )}

      {latest && earliest && (
        <div className="card">
          <h3>Muutokset (viimeisin vs. ensimmäinen)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mitta</th>
                  <th>Ensimmäinen</th>
                  <th>Viimeisin</th>
                  <th>Muutos</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => {
                  const first = getField(earliest, f.key);
                  const last = getField(latest, f.key);
                  if (!first && !last) return null;
                  const diff = first && last ? (last - first).toFixed(1) : null;
                  return (
                    <tr key={f.key}>
                      <td>{f.label}</td>
                      <td>{first ? `${first} cm` : '—'}</td>
                      <td>{last ? `${last} cm` : '—'}</td>
                      <td>
                        {diff ? (
                          <span
                            className={
                              parseFloat(diff) > 0
                                ? 'text-success'
                                : parseFloat(diff) < 0
                                ? 'text-danger'
                                : ''
                            }
                          >
                            {parseFloat(diff) > 0 ? '+' : ''}
                            {diff} cm
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty-state">
          <p>Ei vielä mittauksia. Lisää ensimmäinen mittaus!</p>
        </div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="card">
            <div
              className="flex-between"
              style={{ cursor: 'pointer' }}
              onClick={() =>
                setExpanded(expanded === entry.id ? null : entry.id)
              }
            >
              <div>
                <h3 style={{ marginBottom: 0 }}>
                  {format(parseISO(entry.date), 'd.M.yyyy', { locale: fi })}
                </h3>
                <span className="text-muted text-sm">
                  {FIELDS.filter((f) => getField(entry, f.key) != null).length} mittaa
                </span>
              </div>
              <div className="flex gap-sm">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.id);
                  }}
                >
                  Poista
                </button>
                <span className="text-muted">
                  {expanded === entry.id ? '▲' : '▼'}
                </span>
              </div>
            </div>
            {expanded === entry.id && (
              <div className="mt-1">
                <div className="table-wrap">
                  <table>
                    <tbody>
                      {FIELDS.filter((f) => getField(entry, f.key) != null).map((f) => (
                        <tr key={f.key}>
                          <td className="text-muted">{f.label}</td>
                          <td>{getField(entry, f.key)} cm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {entry.notes && (
                  <p className="text-muted text-sm mt-1">{entry.notes}</p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
