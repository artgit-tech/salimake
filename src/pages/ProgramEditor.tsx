import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { getProgram, saveProgram } from '../storage';
import type { Program, WorkoutDay, Exercise } from '../types';

function createExercise(): Exercise {
  return { id: uuid(), name: '', sets: 3, reps: '10', restSeconds: 90 };
}

function createDay(): WorkoutDay {
  return { id: uuid(), name: '', exercises: [createExercise()] };
}

function createProgram(): Program {
  return {
    id: uuid(),
    name: '',
    description: '',
    days: [createDay()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function ProgramEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = id ? getProgram(id) : undefined;

  const [program, setProgram] = useState<Program>(existing ?? createProgram());

  const updateProgram = (partial: Partial<Program>) => {
    setProgram((prev) => ({ ...prev, ...partial }));
  };

  const updateDay = (dayIdx: number, partial: Partial<WorkoutDay>) => {
    setProgram((prev) => {
      const days = [...prev.days];
      days[dayIdx] = { ...days[dayIdx], ...partial };
      return { ...prev, days };
    });
  };

  const addDay = () => {
    setProgram((prev) => ({ ...prev, days: [...prev.days, createDay()] }));
  };

  const removeDay = (dayIdx: number) => {
    if (program.days.length <= 1) return;
    setProgram((prev) => ({
      ...prev,
      days: prev.days.filter((_, i) => i !== dayIdx),
    }));
  };

  const updateExercise = (dayIdx: number, exIdx: number, partial: Partial<Exercise>) => {
    setProgram((prev) => {
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises];
      exercises[exIdx] = { ...exercises[exIdx], ...partial };
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const addExercise = (dayIdx: number) => {
    setProgram((prev) => {
      const days = [...prev.days];
      days[dayIdx] = {
        ...days[dayIdx],
        exercises: [...days[dayIdx].exercises, createExercise()],
      };
      return { ...prev, days };
    });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setProgram((prev) => {
      const days = [...prev.days];
      days[dayIdx] = {
        ...days[dayIdx],
        exercises: days[dayIdx].exercises.filter((_, i) => i !== exIdx),
      };
      return { ...prev, days };
    });
  };

  const handleSave = () => {
    if (!program.name.trim()) {
      alert('Anna ohjelmalle nimi');
      return;
    }

    for (const day of program.days) {
      if (!day.name.trim()) {
        alert('Anna kaikille treenipäiville nimi');
        return;
      }
      for (const ex of day.exercises) {
        if (!ex.name.trim()) {
          alert('Anna kaikille liikkeille nimi');
          return;
        }
      }
    }

    saveProgram({ ...program, updatedAt: new Date().toISOString() });
    navigate('/programs');
  };

  return (
    <div>
      <h1 className="page-title">{existing ? 'Muokkaa ohjelmaa' : 'Uusi ohjelma'}</h1>

      <div className="card">
        <div className="form-group">
          <label>Ohjelman nimi</label>
          <input
            type="text"
            value={program.name}
            onChange={(e) => updateProgram({ name: e.target.value })}
            placeholder="esim. PPL-ohjelma"
          />
        </div>
        <div className="form-group">
          <label>Kuvaus (valinnainen)</label>
          <textarea
            value={program.description}
            onChange={(e) => updateProgram({ description: e.target.value })}
            placeholder="Ohjelman kuvaus..."
          />
        </div>
      </div>

      {program.days.map((day, dayIdx) => (
        <div key={day.id} className="card">
          <div className="flex-between mb-1">
            <h3>Treenipäivä {dayIdx + 1}</h3>
            {program.days.length > 1 && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeDay(dayIdx)}
              >
                Poista päivä
              </button>
            )}
          </div>

          <div className="form-group">
            <label>Päivän nimi</label>
            <input
              type="text"
              value={day.name}
              onChange={(e) => updateDay(dayIdx, { name: e.target.value })}
              placeholder="esim. Työntävät / Yläkroppa A"
            />
          </div>

          {day.exercises.map((ex, exIdx) => (
            <div key={ex.id} className="exercise-row">
              <div className="exercise-fields">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Liike</label>
                  <input
                    type="text"
                    value={ex.name}
                    onChange={(e) =>
                      updateExercise(dayIdx, exIdx, { name: e.target.value })
                    }
                    placeholder="esim. Penkkipunnerrus"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Sarjat</label>
                  <input
                    type="number"
                    value={ex.sets}
                    min={1}
                    onChange={(e) =>
                      updateExercise(dayIdx, exIdx, {
                        sets: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Toistot</label>
                  <input
                    type="text"
                    value={ex.reps}
                    onChange={(e) =>
                      updateExercise(dayIdx, exIdx, { reps: e.target.value })
                    }
                    placeholder="8-12"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Lepo (s)</label>
                  <input
                    type="number"
                    value={ex.restSeconds}
                    min={0}
                    step={15}
                    onChange={(e) =>
                      updateExercise(dayIdx, exIdx, {
                        restSeconds: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-1" style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeExercise(dayIdx, exIdx)}
                >
                  Poista liike
                </button>
              </div>
            </div>
          ))}

          <button className="btn btn-ghost btn-sm" onClick={() => addExercise(dayIdx)}>
            + Lisää liike
          </button>
        </div>
      ))}

      <div className="flex gap-sm mb-2">
        <button className="btn btn-ghost" onClick={addDay}>
          + Lisää treenipäivä
        </button>
      </div>

      <div className="flex gap-sm">
        <button className="btn btn-primary" onClick={handleSave}>
          Tallenna ohjelma
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/programs')}>
          Peruuta
        </button>
      </div>
    </div>
  );
}
