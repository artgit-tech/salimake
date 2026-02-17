import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { getProgram, saveWorkoutLog, getWorkoutLogs } from '../storage';
import type { WorkoutLog, LoggedExercise, LoggedSet } from '../types';

export default function WorkoutLogger() {
  const { programId, dayId } = useParams<{ programId: string; dayId: string }>();
  const navigate = useNavigate();
  const program = programId ? getProgram(programId) : undefined;
  const day = program?.days.find((d) => d.id === dayId);
  const startTime = useRef(Date.now());

  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!day) return;

    // Look for previous workout for this day to pre-fill weights
    const prevLogs = getWorkoutLogs()
      .filter((l) => l.programId === programId && l.dayId === dayId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const prev = prevLogs[0];

    const initial: LoggedExercise[] = day.exercises.map((ex) => {
      const prevEx = prev?.exercises.find((pe) => pe.exerciseName === ex.name);
      const sets: LoggedSet[] = Array.from({ length: ex.sets }, (_, i) => ({
        reps: prevEx?.sets[i]?.reps ?? (parseInt(ex.reps) || 10),
        weight: prevEx?.sets[i]?.weight ?? 0,
      }));
      return { exerciseId: ex.id, exerciseName: ex.name, sets };
    });

    setExercises(initial);
  }, [day, programId, dayId]);

  if (!program || !day) {
    return (
      <div className="empty-state">
        <p>Ohjelmaa tai treenipäivää ei löytynyt.</p>
        <button className="btn btn-primary" onClick={() => navigate('/programs')}>
          Takaisin ohjelmiin
        </button>
      </div>
    );
  }

  const updateSet = (exIdx: number, setIdx: number, partial: Partial<LoggedSet>) => {
    setExercises((prev) => {
      const copy = [...prev];
      const sets = [...copy[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...partial };
      copy[exIdx] = { ...copy[exIdx], sets };
      return copy;
    });
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const lastSet = copy[exIdx].sets[copy[exIdx].sets.length - 1];
      copy[exIdx] = {
        ...copy[exIdx],
        sets: [...copy[exIdx].sets, { reps: lastSet?.reps ?? 10, weight: lastSet?.weight ?? 0 }],
      };
      return copy;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      if (copy[exIdx].sets.length <= 1) return prev;
      copy[exIdx] = {
        ...copy[exIdx],
        sets: copy[exIdx].sets.filter((_, i) => i !== setIdx),
      };
      return copy;
    });
  };

  const handleSave = () => {
    const durationMinutes = Math.round((Date.now() - startTime.current) / 60000);

    const log: WorkoutLog = {
      id: uuid(),
      programId: program.id,
      dayId: day.id,
      dayName: `${program.name} — ${day.name}`,
      date: new Date().toISOString().split('T')[0],
      exercises,
      durationMinutes,
      notes: notes || undefined,
    };

    saveWorkoutLog(log);
    navigate('/history');
  };

  return (
    <div>
      <h1 className="page-title">
        {program.name} — {day.name}
      </h1>

      {exercises.map((ex, exIdx) => {
        const template = day.exercises.find((e) => e.id === ex.exerciseId);
        return (
          <div key={ex.exerciseId} className="card">
            <div className="flex-between mb-1">
              <h3>{ex.exerciseName}</h3>
              {template && (
                <span className="badge">
                  {template.sets}×{template.reps} · lepo {template.restSeconds}s
                </span>
              )}
            </div>

            <div className="set-row" style={{ marginBottom: '0.25rem' }}>
              <span className="set-num">#</span>
              <span className="text-muted text-sm">Paino (kg)</span>
              <span className="text-muted text-sm">Toistot</span>
              <span></span>
            </div>

            {ex.sets.map((set, setIdx) => (
              <div key={setIdx} className="set-row">
                <span className="set-num">{setIdx + 1}</span>
                <input
                  type="number"
                  value={set.weight || ''}
                  min={0}
                  step={0.5}
                  placeholder="0"
                  onChange={(e) =>
                    updateSet(exIdx, setIdx, {
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <input
                  type="number"
                  value={set.reps || ''}
                  min={0}
                  placeholder="0"
                  onChange={(e) =>
                    updateSet(exIdx, setIdx, {
                      reps: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <button
                  className="btn btn-danger btn-sm"
                  style={{ padding: '0.25rem' }}
                  onClick={() => removeSet(exIdx, setIdx)}
                  title="Poista sarja"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              className="btn btn-ghost btn-sm mt-1"
              onClick={() => addSet(exIdx)}
            >
              + Sarja
            </button>
          </div>
        );
      })}

      <div className="card">
        <div className="form-group">
          <label>Muistiinpanot (valinnainen)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Miltä treeni tuntui..."
          />
        </div>
      </div>

      <div className="flex gap-sm">
        <button className="btn btn-primary" onClick={handleSave}>
          Tallenna treeni
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Peruuta
        </button>
      </div>
    </div>
  );
}
