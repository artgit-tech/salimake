import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';

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

  // Get unique day names for filtering
  const dayNames = [...new Set(logs.map((l) => l.dayName))];

  const filteredLogs = filter
    ? logs.filter((l) => l.dayName === filter)
    : logs;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Haluatko varmasti poistaa tämän treenin?')) return;
    await deleteWorkoutLog(id);
  };

  // Format sets compactly like "40-35-35" from the Google Sheet style
  const formatSetsCompact = (sets: { weight: number; reps: number }[]) => {
    const weights = sets.map((s) => s.weight);
    const reps = sets.map((s) => s.reps);

    const allSameWeight = weights.every((w) => w === weights[0]);
    const allSameReps = reps.every((r) => r === reps[0]);

    if (allSameWeight && allSameReps) {
      return `${sets.length}×${weights[0]}kg×${reps[0]}`;
    }

    return sets.map((s) => `${s.weight}kg×${s.reps}`).join(' / ');
  };

  // Find previous log for comparison
  const findPreviousLog = (log: typeof logs[0]) => {
    const sameDayLogs = logs.filter(
      (l) => l.dayName === log.dayName && l.date < log.date
    );
    return sameDayLogs[0] || null;
  };

  return (
    <div>
      <h1 className="page-title">Treenihistoria</h1>

      {/* Filter by day name */}
      {dayNames.length > 1 && (
        <div className="mb-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Kaikki treenit</option>
            {dayNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
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
                  <h3 style={{ marginBottom: '0.25rem' }}>{log.dayName}</h3>
                  <span className="text-muted text-sm">
                    {format(parseISO(log.date), 'EEEE d.M.yyyy', { locale: fi })}
                    {log.durationMinutes ? ` · ${log.durationMinutes} min` : ''}
                    {` · ${log.exercises.length} liikettä`}
                  </span>
                </div>
                <div className="flex gap-sm">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(log.id);
                    }}
                  >
                    Poista
                  </button>
                  <span className="text-muted">{expanded === log.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Compact summary always visible */}
              {expanded !== log.id && (
                <div className="mt-1">
                  {log.exercises.map((ex, i) => (
                    <span key={i} className="text-sm text-muted" style={{ display: 'block' }}>
                      {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}
                      {ex.wasSubstitute ? ' *' : ''}
                      {' — '}
                      {formatSetsCompact(ex.sets)}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded details */}
              {expanded === log.id && (
                <div className="mt-2">
                  {log.exercises.map((ex, i) => {
                    // Find same exercise in previous log for comparison
                    const prevEx = prevLog?.exercises.find(
                      (pe) => pe.exerciseName === ex.exerciseName
                    );

                    return (
                      <div key={i} className="history-exercise">
                        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <strong>
                              {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}
                            </strong>
                            {ex.wasSubstitute && (
                              <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>
                                korvaava
                              </span>
                            )}
                            {ex.equipment && (
                              <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>
                                ({ex.equipment})
                              </span>
                            )}
                          </div>
                          <span className="text-muted text-sm">
                            {formatSetsCompact(ex.sets)}
                          </span>
                        </div>

                        <div className="table-wrap mt-1">
                          <table>
                            <thead>
                              <tr>
                                <th>Sarja</th>
                                <th>Paino (kg)</th>
                                <th>Toistot</th>
                                {prevEx && <th className="text-muted">Edellinen</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {ex.sets.map((set, si) => {
                                const prevSet = prevEx?.sets[si];
                                const weightDiff = prevSet
                                  ? set.weight - prevSet.weight
                                  : 0;
                                return (
                                  <tr key={si}>
                                    <td>{si + 1}</td>
                                    <td>
                                      {set.weight}
                                      {weightDiff !== 0 && (
                                        <span
                                          className={
                                            weightDiff > 0 ? 'text-success' : 'text-danger'
                                          }
                                          style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}
                                        >
                                          {weightDiff > 0 ? '+' : ''}
                                          {weightDiff}
                                        </span>
                                      )}
                                    </td>
                                    <td>{set.reps}</td>
                                    {prevEx && (
                                      <td className="text-muted">
                                        {prevSet
                                          ? `${prevSet.weight}kg × ${prevSet.reps}`
                                          : '—'}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {ex.notes && (
                          <p className="text-muted text-sm mt-1">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Order comparison with previous */}
                  {prevLog && (
                    <div className="order-comparison mt-2">
                      <span className="text-muted text-sm" style={{ fontWeight: 500 }}>
                        Järjestysvertailu edelliseen:
                      </span>
                      <div className="order-comparison-grid mt-1">
                        <div>
                          <span className="text-muted text-sm">Tämä kerta</span>
                          {log.exercises.map((ex, i) => (
                            <div key={i} className="text-sm">
                              {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}
                              {ex.wasSubstitute ? ' *' : ''}
                            </div>
                          ))}
                        </div>
                        <div>
                          <span className="text-muted text-sm">Edellinen</span>
                          {prevLog.exercises.map((ex, i) => (
                            <div key={i} className="text-sm">
                              {(ex.orderIndex ?? i) + 1}. {ex.exerciseName}
                              {ex.wasSubstitute ? ' *' : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {log.notes && (
                    <div className="mt-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <p className="text-muted text-sm">
                        <strong>Muistiinpanot:</strong> {log.notes}
                      </p>
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
