import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { getWeightEntries, saveWeightEntry, deleteWeightEntry } from '../storage';
import type { WeightEntry } from '../types';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function WeightTracker() {
  const [entries, setEntries] = useState<WeightEntry[]>(() =>
    getWeightEntries().sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  );
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const refresh = () => {
    setEntries(
      getWeightEntries().sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    );
  };

  const handleAdd = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      alert('Syötä kelvollinen paino');
      return;
    }
    saveWeightEntry({
      id: uuid(),
      date,
      weight: w,
      notes: notes || undefined,
    });
    setWeight('');
    setNotes('');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Haluatko poistaa tämän merkinnän?')) return;
    deleteWeightEntry(id);
    refresh();
  };

  const chartData = entries.map((e) => ({
    date: format(parseISO(e.date), 'd.M', { locale: fi }),
    paino: e.weight,
  }));

  const minWeight = entries.length
    ? Math.floor(Math.min(...entries.map((e) => e.weight)) - 2)
    : 0;
  const maxWeight = entries.length
    ? Math.ceil(Math.max(...entries.map((e) => e.weight)) + 2)
    : 100;

  const latestWeight = entries.length ? entries[entries.length - 1].weight : null;
  const firstWeight = entries.length ? entries[0].weight : null;
  const weightChange =
    latestWeight !== null && firstWeight !== null
      ? (latestWeight - firstWeight).toFixed(1)
      : null;

  return (
    <div>
      <h1 className="page-title">Painonseuranta</h1>

      {entries.length >= 2 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Nykyinen paino</div>
            <div className="stat-value">{latestWeight} kg</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Muutos</div>
            <div
              className="stat-value"
              style={{
                color:
                  weightChange && parseFloat(weightChange) > 0
                    ? 'var(--warning)'
                    : weightChange && parseFloat(weightChange) < 0
                    ? 'var(--success)'
                    : 'var(--text)',
              }}
            >
              {weightChange && parseFloat(weightChange) > 0 ? '+' : ''}
              {weightChange} kg
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Merkintöjä</div>
            <div className="stat-value">{entries.length}</div>
          </div>
        </div>
      )}

      {entries.length >= 2 && (
        <div className="card">
          <h3>Painokäyrä</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3144" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis domain={[minWeight, maxWeight]} stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: '#1a1d27',
                  border: '1px solid #2e3144',
                  borderRadius: '8px',
                  color: '#e4e4e7',
                }}
              />
              <Line
                type="monotone"
                dataKey="paino"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }}
                name="Paino (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h3>Lisää merkintä</h3>
        <div className="flex gap-sm flex-wrap" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '120px', marginBottom: 0 }}>
            <label>Päivämäärä</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '100px', marginBottom: 0 }}>
            <label>Paino (kg)</label>
            <input
              type="number"
              value={weight}
              step={0.1}
              min={0}
              placeholder="80.0"
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '2', minWidth: '120px', marginBottom: 0 }}>
            <label>Muistiinpano</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="valinnainen"
            />
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            Lisää
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="card">
          <h3>Historia</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Päivä</th>
                  <th>Paino (kg)</th>
                  <th>Muistiinpano</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...entries]
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((e) => (
                    <tr key={e.id}>
                      <td>{format(parseISO(e.date), 'd.M.yyyy', { locale: fi })}</td>
                      <td>{e.weight}</td>
                      <td className="text-muted">{e.notes || '—'}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(e.id)}
                        >
                          Poista
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
