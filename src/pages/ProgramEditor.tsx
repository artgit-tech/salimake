import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { useData } from '../contexts/DataContext';
import type { Program, WorkoutDay, Exercise, AlternativeExercise } from '../types';

function createAlternative(): AlternativeExercise {
  return { id: uuid(), name: '', equipment: '' };
}

function createExercise(): Exercise {
  return {
    id: uuid(),
    name: '',
    equipment: '',
    sets: 3,
    reps: '10',
    restSeconds: 90,
    notes: '',
    alternatives: [],
  };
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
  const { programs, saveProgram, loading } = useData();
  const existing = id ? programs.find((p) => p.id === id) : undefined;

  const [program, setProgram] = useState<Program>(existing ?? createProgram());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  // Drag & drop state
  const dragItem = useRef<{ dayIdx: number; exIdx: number } | null>(null);
  const dragOverItem = useRef<{ dayIdx: number; exIdx: number } | null>(null);

  if (loading) {
    return <div className="loading-spinner" />;
  }

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

  // --- Alternative exercises ---
  const addAlternative = (dayIdx: number, exIdx: number) => {
    setProgram((prev) => {
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises];
      const alts = [...(exercises[exIdx].alternatives || []), createAlternative()];
      exercises[exIdx] = { ...exercises[exIdx], alternatives: alts };
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const updateAlternative = (
    dayIdx: number,
    exIdx: number,
    altIdx: number,
    partial: Partial<AlternativeExercise>
  ) => {
    setProgram((prev) => {
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises];
      const alts = [...(exercises[exIdx].alternatives || [])];
      alts[altIdx] = { ...alts[altIdx], ...partial };
      exercises[exIdx] = { ...exercises[exIdx], alternatives: alts };
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const removeAlternative = (dayIdx: number, exIdx: number, altIdx: number) => {
    setProgram((prev) => {
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises];
      const alts = (exercises[exIdx].alternatives || []).filter((_, i) => i !== altIdx);
      exercises[exIdx] = { ...exercises[exIdx], alternatives: alts };
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  // --- Drag & drop reordering ---
  const handleDragStart = (dayIdx: number, exIdx: number) => {
    dragItem.current = { dayIdx, exIdx };
  };

  const handleDragEnter = (dayIdx: number, exIdx: number) => {
    dragOverItem.current = { dayIdx, exIdx };
  };

  const handleDragEnd = () => {
    if (!dragItem.current || !dragOverItem.current) return;
    const { dayIdx: fromDay, exIdx: fromEx } = dragItem.current;
    const { dayIdx: toDay, exIdx: toEx } = dragOverItem.current;

    // Only reorder within the same day
    if (fromDay !== toDay) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    setProgram((prev) => {
      const days = [...prev.days];
      const exercises = [...days[fromDay].exercises];
      const [movedItem] = exercises.splice(fromEx, 1);
      exercises.splice(toEx, 0, movedItem);
      days[fromDay] = { ...days[fromDay], exercises };
      return { ...prev, days };
    });

    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- Move exercise up/down (fallback for mobile) ---
  const moveExercise = (dayIdx: number, exIdx: number, direction: -1 | 1) => {
    const newIdx = exIdx + direction;
    if (newIdx < 0 || newIdx >= program.days[dayIdx].exercises.length) return;
    setProgram((prev) => {
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises];
      [exercises[exIdx], exercises[newIdx]] = [exercises[newIdx], exercises[exIdx]];
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const toggleExpanded = (exerciseId: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const handleSave = async () => {
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

    await saveProgram({ ...program, updatedAt: new Date().toISOString() });
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
              placeholder="esim. Rintapäivä / Selkäpäivä / Jalkapäivä"
            />
          </div>

          {day.exercises.map((ex, exIdx) => (
            <div
              key={ex.id}
              className="exercise-row"
              draggable
              onDragStart={() => handleDragStart(dayIdx, exIdx)}
              onDragEnter={() => handleDragEnter(dayIdx, exIdx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              {/* Drag handle + exercise number + move buttons */}
              <div className="exercise-header">
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                  <span className="drag-handle" title="Raahaa järjestääksesi">⠿</span>
                  <span className="exercise-number">{exIdx + 1}.</span>
                  <div className="move-buttons">
                    <button
                      className="btn-icon"
                      onClick={() => moveExercise(dayIdx, exIdx, -1)}
                      disabled={exIdx === 0}
                      title="Siirrä ylös"
                    >
                      ▲
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => moveExercise(dayIdx, exIdx, 1)}
                      disabled={exIdx === day.exercises.length - 1}
                      title="Siirrä alas"
                    >
                      ▼
                    </button>
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeExercise(dayIdx, exIdx)}
                >
                  Poista
                </button>
              </div>

              {/* Main exercise fields */}
              <div className="exercise-fields-2col">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Liikkeen nimi</label>
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
                  <label>Väline / suoritustapa</label>
                  <input
                    type="text"
                    value={ex.equipment || ''}
                    onChange={(e) =>
                      updateExercise(dayIdx, exIdx, { equipment: e.target.value })
                    }
                    placeholder="esim. rintaprässi, tasapenkki"
                  />
                </div>
              </div>

              <div className="exercise-fields-4col mt-1">
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

              {/* Notes field */}
              <div className="form-group mt-1" style={{ marginBottom: 0 }}>
                <label>Muistiinpano (valinnainen)</label>
                <input
                  type="text"
                  value={ex.notes || ''}
                  onChange={(e) =>
                    updateExercise(dayIdx, exIdx, { notes: e.target.value })
                  }
                  placeholder="esim. käsien leveys, vinkki suoritukseen..."
                />
              </div>

              {/* Expandable: Alternative exercises */}
              <div className="mt-1">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleExpanded(ex.id)}
                >
                  {expandedExercises.has(ex.id) ? '▲' : '▼'} Vaihtoehtoiset liikkeet
                  {(ex.alternatives?.length ?? 0) > 0 && ` (${ex.alternatives!.length})`}
                </button>

                {expandedExercises.has(ex.id) && (
                  <div className="alternatives-section">
                    {(ex.alternatives || []).map((alt, altIdx) => (
                      <div key={alt.id} className="alternative-row">
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                          <label>Vaihtoehtoinen liike</label>
                          <input
                            type="text"
                            value={alt.name}
                            onChange={(e) =>
                              updateAlternative(dayIdx, exIdx, altIdx, {
                                name: e.target.value,
                              })
                            }
                            placeholder="esim. Tasapenkki"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                          <label>Väline</label>
                          <input
                            type="text"
                            value={alt.equipment || ''}
                            onChange={(e) =>
                              updateAlternative(dayIdx, exIdx, altIdx, {
                                equipment: e.target.value,
                              })
                            }
                            placeholder="esim. vapaapenkki"
                          />
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ alignSelf: 'flex-end' }}
                          onClick={() => removeAlternative(dayIdx, exIdx, altIdx)}
                          title="Poista vaihtoehto"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => addAlternative(dayIdx, exIdx)}
                    >
                      + Lisää vaihtoehto
                    </button>
                  </div>
                )}
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
