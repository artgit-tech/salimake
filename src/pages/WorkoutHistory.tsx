import { useState } from 'react';
import { getWorkoutLogs, deleteWorkoutLog } from '../storage';
import type { WorkoutLog } from '../types';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';

export default function WorkoutHistory() {
  const [logs, setLogs] = useState<WorkoutLog[]>(() =>
    getWorkoutLogs().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!window.confirm('Haluatko varmasti poistaa tämän treenin?')) return;
    deleteWorkoutLog(id);
    setLogs(
      getWorkoutLogs().sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );
  };

  return (
    <div>
      <h1 className="page-title">Treenihistoria</h1>

      {logs.length === 0 ? (
        <div className="empty-state">
          <p>Ei vielä tallennettuja treenejä.</p>
        </div>
      ) : (
        logs.map((log) => (
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

            {expanded === log.id && (
              <div className="mt-2">
                {log.exercises.map((ex, i) => (
                  <div key={i} style={{ marginBottom: '1rem' }}>
                    <strong>{ex.exerciseName}</strong>
                    <div className="table-wrap mt-1">
                      <table>
                        <thead>
                          <tr>
                            <th>Sarja</th>
                            <th>Paino (kg)</th>
                            <th>Toistot</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.sets.map((set, si) => (
                            <tr key={si}>
                              <td>{si + 1}</td>
                              <td>{set.weight}</td>
                              <td>{set.reps}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {log.notes && (
                  <p className="text-muted text-sm">
                    <strong>Muistiinpanot:</strong> {log.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
