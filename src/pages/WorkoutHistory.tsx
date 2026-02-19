import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';
import type { WorkoutLog } from '../types';

export default function WorkoutHistory() {
  const { workoutLogs, deleteWorkoutLog, loading } = useData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  if (loading) {
    return <div className="loading-spinner" />;
  }

  const logs = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const dayNames = [...new Set(logs.map((l) => l.dayName))];

  const filteredLogs = filter
    ? logs.filter((l) => l.dayName === filter)
    : logs;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Haluatko varmasti poistaa tämän treenin?')) return;
    await deleteWorkoutLog(id);
  };

  const formatSetsCompact = (sets: { weight: number; reps: number }[]) => {
    const weights = sets.map((s) => s.weight);
    const reps = sets.map((s) => s.reps);
    const allSameWeight = weights.every((w) => w === weights[0]);
    const allSameReps = reps.every((r) => r === reps[0]);
    if (allSameWeight && allSameReps) {
      return `${sets.length}x${weights[0]}kg x${reps[0]}`;
    }
    return sets.map((s) => `${s.weight}kg x${s.reps}`).join(' / ');
  };

  const findPreviousLog = (log: WorkoutLog) => {
    const sameDayLogs = logs.filter(
      (l) => l.dayName === log.dayName && l.date < log.date && !l.skipped
    );
    return sameDayLogs[0] || null;
  };

  // --- Export to Google Sheets CSV ---
  const exportToCSV = () => {
    const logsToExport = filteredLogs;
    if (logsToExport.length === 0) return;

    const rows: string[][] = [
      ['Päivämäärä', 'Ohjelma', 'Liike', 'Väline', 'Järjestys', 'Sarja', 'Paino (kg)', 'Toistot', 'Korvaava', 'Muistiinpano (liike)', 'Muistiinpano (treeni)', 'Kesto (min)', 'Skipattu'],
    ];

    for (const log of logsToExport) {
      if (log.skipped || log.exercises.length === 0) {
        rows.push([
          log.date,
          log.dayName,
          '', '', '', '', '', '', '',
          '',
          log.notes || '',
          String(log.durationMinutes || ''),
          log.skipped ? 'Kyllä' : '',
        ]);
        continue;
      }
      for (const ex of log.exercises) {
        for (let si = 0; si < ex.sets.length; si++) {
          const set = ex.sets[si];
          rows.push([
            log.date,
            log.dayName,
            ex.exerciseName,
            ex.equipment || '',
            String((ex.orderIndex ?? 0) + 1),
            String(si + 1),
            String(set.weight),
            String(set.reps),
            ex.wasSubstitute ? 'Kyllä' : '',
            si === 0 ? (ex.notes || '') : '',
            si === 0 ? (log.notes || '') : '',
            si === 0 ? String(log.durationMinutes || '') : '',
            '',
          ]);
        }
      }
    }

    const csvContent = rows
      .map((row) =>
        row.map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
      .join('\n');

    // BOM for Excel UTF-8
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salimake-treenihistoria-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Treenihistoria</h1>
        {filteredLogs.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={exportToCSV}>
            Lataa CSV
          </button>
        )}
      </div>

      {dayNames.length > 1 && (
        <div className="mb-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Kaikki treenit</option>
            {dayNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {filteredLogs.length === 0 ? (
        <div className="empty-state">
          <p>Ei vielä tallennettuja treenejä.</p>
        </div>
      ) : (
        filteredLogs.map((log) => {
          const prevLog = findPreviousLog(log);

          return (
            <div key={log.id} className="card">
              <div
                className="flex-between"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <div>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                    {log.dayName}
                    {log.skipped && (
                      <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>Skipattu</span>
                    )}
                  </h3>
                  <span className="text-muted text-sm">
                    {format(parseISO(log.date), 'EEEE d.M.yyyy', { locale: fi })}
                    {log.durationMinutes ? ` · ${log.durationMinutes} min` : ''}
                  </span>
                </div>
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                  >
                    Poista
                  </button>
                  <span className="text-muted">{expanded === log.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Compact summary */}
              {expanded !== log.id && (
                <div className="mt-1">
                  {log.skipped ? (
                    <span className="text-sm text-muted">Treeni skipattu</span>
                  ) : (
                    log.exercises.map((ex, i) => (
                      <span key={i} className="text-sm text-muted" style={{ display: 'block' }}>
                        {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}
                        {ex.wasSubstitute ? ' *' : ''}
                        {' — '}
                        {formatSetsCompact(ex.sets)}
                      </span>
                    ))
                  )}
                </div>
              )}

              {/* Expanded */}
              {expanded === log.id && (
                <div className="mt-2">
                  {log.exercises.map((ex, i) => {
                    const prevEx = prevLog?.exercises.find(
                      (pe) => pe.exerciseName === ex.exerciseName
                    );

                    return (
                      <div key={i} className="history-exercise">
                        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>
                              {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}
                            </strong>
                            {ex.wasSubstitute && (
                              <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>korvaava</span>
                            )}
                            {ex.equipment && (
                              <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>({ex.equipment})</span>
                            )}
                          </div>
                        </div>

                        <div className="table-wrap mt-1">
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>kg</th>
                                <th>Toistot</th>
                                {prevEx && <th>Edell.</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {ex.sets.map((set, si) => {
                                const prevSet = prevEx?.sets[si];
                                const weightDiff = prevSet ? set.weight - prevSet.weight : 0;
                                return (
                                  <tr key={si}>
                                    <td>{si + 1}</td>
                                    <td>
                                      {set.weight}
                                      {weightDiff !== 0 && (
                                        <span className={weightDiff > 0 ? 'text-success' : 'text-danger'} style={{ fontSize: '0.7rem', marginLeft: '0.2rem' }}>
                                          {weightDiff > 0 ? '+' : ''}{weightDiff}
                                        </span>
                                      )}
                                    </td>
                                    <td>{set.reps}</td>
                                    {prevEx && (
                                      <td className="text-muted">
                                        {prevSet ? `${prevSet.weight} x ${prevSet.reps}` : '—'}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {ex.notes && (
                          <p className="text-muted text-sm mt-1">{ex.notes}</p>
                        )}
                      </div>
                    );
                  })}

                  {prevLog && (
                    <div className="order-comparison mt-2">
                      <span className="text-muted text-sm" style={{ fontWeight: 500 }}>
                        Järjestysvertailu:
                      </span>
                      <div className="order-comparison-grid mt-1">
                        <div>
                          <span className="text-muted text-sm">Tämä</span>
                          {log.exercises.map((ex, i) => (
                            <div key={i} className="text-sm">
                              {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}{ex.wasSubstitute ? ' *' : ''}
                            </div>
                          ))}
                        </div>
                        <div>
                          <span className="text-muted text-sm">Edellinen</span>
                          {prevLog.exercises.map((ex, i) => (
                            <div key={i} className="text-sm">
                              {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}{ex.wasSubstitute ? ' *' : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {log.notes && (
                    <div className="mt-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <p className="text-muted text-sm"><strong>Muistiinpanot:</strong> {log.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
