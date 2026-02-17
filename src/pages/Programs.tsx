import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPrograms, deleteProgram } from '../storage';
import type { Program } from '../types';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>(getPrograms);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Haluatko varmasti poistaa ohjelman "${name}"?`)) {
      deleteProgram(id);
      setPrograms(getPrograms());
    }
  };

  return (
    <div>
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Ohjelmat
        </h1>
        <Link to="/programs/new" className="btn btn-primary">
          + Uusi ohjelma
        </Link>
      </div>

      {programs.length === 0 ? (
        <div className="empty-state">
          <p>Ei vielä ohjelmia. Luo ensimmäinen treeniohjelma!</p>
          <Link to="/programs/new" className="btn btn-primary">
            Luo ohjelma
          </Link>
        </div>
      ) : (
        programs.map((p) => (
          <div key={p.id} className="card">
            <div className="flex-between">
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>{p.name}</h3>
                {p.description && (
                  <p className="text-muted text-sm mb-1">{p.description}</p>
                )}
                <span className="text-muted text-sm">
                  {p.days.length} treenipäivää · Luotu{' '}
                  {format(parseISO(p.createdAt), 'd.M.yyyy', { locale: fi })}
                </span>
              </div>
              <div className="flex gap-sm">
                <Link to={`/programs/${p.id}`} className="btn btn-ghost btn-sm">
                  Muokkaa
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(p.id, p.name)}
                >
                  Poista
                </button>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-sm">
              {p.days.map((d) => (
                <Link
                  key={d.id}
                  to={`/workout/${p.id}/${d.id}`}
                  className="btn btn-ghost btn-sm"
                >
                  {d.name} ({d.exercises.length} liikettä)
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
