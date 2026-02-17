import { Link } from 'react-router-dom';
import { getPrograms, getWorkoutLogs, getWeightEntries } from '../storage';
import { format, parseISO, isThisWeek } from 'date-fns';
import { fi } from 'date-fns/locale';

export default function Dashboard() {
  const programs = getPrograms();
  const logs = getWorkoutLogs();
  const weights = getWeightEntries().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const thisWeekLogs = logs.filter((l) => isThisWeek(parseISO(l.date), { weekStartsOn: 1 }));
  const latestWeight = weights[0];
  const totalWorkouts = logs.length;

  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div>
      <h1 className="page-title">Etusivu</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Ohjelmia</div>
          <div className="stat-value">{programs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Treeneja tällä viikolla</div>
          <div className="stat-value">{thisWeekLogs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Treeneja yhteensä</div>
          <div className="stat-value">{totalWorkouts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Viimeisin paino</div>
          <div className="stat-value">
            {latestWeight ? `${latestWeight.weight} kg` : '—'}
          </div>
        </div>
      </div>

      {programs.length > 0 && (
        <div className="card">
          <h3>Aloita treeni</h3>
          <div className="flex flex-wrap gap-sm">
            {programs.map((p) =>
              p.days.map((d) => (
                <Link
                  key={d.id}
                  to={`/workout/${p.id}/${d.id}`}
                  className="btn btn-primary btn-sm"
                >
                  {p.name} — {d.name}
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {recentLogs.length > 0 ? (
        <div className="card">
          <h3>Viimeisimmät treenit</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Päivä</th>
                  <th>Ohjelma</th>
                  <th>Liikkeitä</th>
                  <th>Kesto</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{format(parseISO(log.date), 'd.M.yyyy', { locale: fi })}</td>
                    <td>{log.dayName}</td>
                    <td>{log.exercises.length}</td>
                    <td>{log.durationMinutes ? `${log.durationMinutes} min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Ei vielä treenejä. Luo ensin ohjelma ja aloita treenaaminen!</p>
          <Link to="/programs/new" className="btn btn-primary">
            Luo ohjelma
          </Link>
        </div>
      )}
    </div>
  );
}
