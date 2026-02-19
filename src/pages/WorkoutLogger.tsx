import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import type { WorkoutLog, LoggedExercise, LoggedSet, Exercise } from '../types';

interface ExerciseOption {
  id: string;
  name: string;
  equipment?: string;
  sets?: number;
  reps?: string;
  restSeconds?: number;
  isAlternative: boolean;
  originalExerciseId?: string;
}

export default function WorkoutLogger() {
  const { programId, dayId } = useParams<{ programId: string; dayId: string }>();
  const navigate = useNavigate();
  const { programs, workoutLogs, saveWorkoutLog, loading } = useData();
  const program = programs.find((p) => p.id === programId);
  const day = program?.days.find((d) => d.id === dayId);
  const startTime = useRef(Date.now());

  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPrevious, setShowPrevious] = useState<Set<number>>(new Set());
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(new Set());
  const [showTemplateInfo, setShowTemplateInfo] = useState<Set<number>>(new Set());

  // Get previous logs for this day (exclude skipped), sorted by date descending
  const prevLogs = workoutLogs
    .filter((l) => l.programId === programId && l.dayId === dayId && !l.skipped)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const prevLog = prevLogs[0];

  useEffect(() => {
    if (!day) return;

    const initial: LoggedExercise[] = day.exercises.map((ex, idx) => {
      const prevEx = prevLog?.exercises.find(
        (pe) => pe.exerciseId === ex.id || pe.exerciseName === ex.name
      );
      const sets: LoggedSet[] = Array.from({ length: ex.sets }, (_, i) => ({
        reps: prevEx?.sets[i]?.reps ?? (parseInt(ex.reps) || 10),
        weight: prevEx?.sets[i]?.weight ?? 0,
      }));
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        equipment: ex.equipment,
        sets,
        notes: '',
        orderIndex: idx,
        wasSubstitute: false,
      };
    });

    setExercises(initial);
    // Expand all exercises by default
    setExpandedExercises(new Set(initial.map((_, i) => i)));
  }, [day, programId, dayId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="loading-spinner" />;
  }

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

  // Build exercise options (primary + alternatives) for each template exercise
  const getExerciseOptions = (templateEx: Exercise): ExerciseOption[] => {
    const options: ExerciseOption[] = [
      {
        id: templateEx.id,
        name: templateEx.name,
        equipment: templateEx.equipment,
        sets: templateEx.sets,
        reps: templateEx.reps,
        restSeconds: templateEx.restSeconds,
        isAlternative: false,
      },
    ];
    if (templateEx.alternatives) {
      for (const alt of templateEx.alternatives) {
        options.push({
          id: alt.id,
          name: alt.name,
          equipment: alt.equipment,
          sets: alt.sets ?? templateEx.sets,
          reps: alt.reps ?? templateEx.reps,
          restSeconds: alt.restSeconds ?? templateEx.restSeconds,
          isAlternative: true,
          originalExerciseId: templateEx.id,
        });
      }
    }
    return options;
  };

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
        sets: [
          ...copy[exIdx].sets,
          { reps: lastSet?.reps ?? 10, weight: lastSet?.weight ?? 0 },
        ],
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

  const updateExerciseNotes = (exIdx: number, value: string) => {
    setExercises((prev) => {
      const copy = [...prev];
      copy[exIdx] = { ...copy[exIdx], notes: value };
      return copy;
    });
  };

  // Switch to an alternative exercise - use the alternative's own parameters
  const switchExercise = (exIdx: number, option: ExerciseOption) => {
    setExercises((prev) => {
      const copy = [...prev];
      const current = copy[exIdx];

      // Find previous data for the selected exercise
      const prevEx = prevLog?.exercises.find(
        (pe) => pe.exerciseName === option.name
      );

      const targetSets = option.sets ?? current.sets.length;
      const targetReps = parseInt(option.reps || '') || 10;

      const sets: LoggedSet[] = Array.from({ length: targetSets }, (_, i) => ({
        reps: prevEx?.sets[i]?.reps ?? current.sets[i]?.reps ?? targetReps,
        weight: prevEx?.sets[i]?.weight ?? 0,
      }));

      copy[exIdx] = {
        ...current,
        exerciseName: option.name,
        equipment: option.equipment,
        sets,
        wasSubstitute: option.isAlternative,
        originalExerciseId: option.isAlternative ? option.originalExerciseId : undefined,
      };
      return copy;
    });
  };

  // Move exercise in the current workout order
  const moveExercise = (exIdx: number, direction: -1 | 1) => {
    const newIdx = exIdx + direction;
    if (newIdx < 0 || newIdx >= exercises.length) return;
    setExercises((prev) => {
      const copy = [...prev];
      [copy[exIdx], copy[newIdx]] = [copy[newIdx], copy[exIdx]];
      return copy.map((ex, i) => ({ ...ex, orderIndex: i }));
    });
    // Update expanded state to follow the moved exercise
    setExpandedExercises((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx === exIdx) next.add(newIdx);
        else if (idx === newIdx) next.add(exIdx);
        else next.add(idx);
      }
      return next;
    });
  };

  const togglePrevious = (exIdx: number) => {
    setShowPrevious((prev) => {
      const next = new Set(prev);
      if (next.has(exIdx)) next.delete(exIdx);
      else next.add(exIdx);
      return next;
    });
  };

  const toggleExercise = (exIdx: number) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exIdx)) next.delete(exIdx);
      else next.add(exIdx);
      return next;
    });
  };

  const toggleTemplateInfo = (exIdx: number) => {
    setShowTemplateInfo((prev) => {
      const next = new Set(prev);
      if (next.has(exIdx)) next.delete(exIdx);
      else next.add(exIdx);
      return next;
    });
  };

  const getPreviousExercise = (exerciseName: string) => {
    if (!prevLog) return null;
    return prevLog.exercises.find((pe) => pe.exerciseName === exerciseName) || null;
  };

  // Save workout
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const durationMinutes = Math.round((Date.now() - startTime.current) / 60000);

      const log: WorkoutLog = {
        id: uuid(),
        programId: program.id,
        dayId: day.id,
        dayName: `${program.name} — ${day.name}`,
        date: new Date().toISOString().split('T')[0],
        exercises: exercises.map((ex, i) => ({
          ...ex,
          orderIndex: i,
          notes: ex.notes || undefined,
        })),
        durationMinutes,
        notes: notes || undefined,
      };

      await saveWorkoutLog(log);
      navigate('/history');
    } catch (err) {
      console.error('Tallennus epäonnistui:', err);
      alert('Tallentaminen epäonnistui. Yritä uudelleen.');
    } finally {
      setSaving(false);
    }
  };

  // Skip workout
  const handleSkip = async () => {
    if (!window.confirm('Haluatko varmasti skipata treenin?')) return;
    if (saving) return;
    setSaving(true);
    try {
      const log: WorkoutLog = {
        id: uuid(),
        programId: program.id,
        dayId: day.id,
        dayName: `${program.name} — ${day.name}`,
        date: new Date().toISOString().split('T')[0],
        exercises: [],
        skipped: true,
        notes: notes || undefined,
      };

      await saveWorkoutLog(log);
      navigate('/history');
    } catch (err) {
      console.error('Skipan tallennus epäonnistui:', err);
      alert('Tallentaminen epäonnistui. Yritä uudelleen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header with edit shortcut */}
      <div className="flex-between mb-1">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
            {day.name}
          </h1>
          <p className="text-muted text-sm">{program.name}</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/programs/${programId}`)}
          title="Muokkaa ohjelmaa"
        >
          Muokkaa
        </button>
      </div>

      {prevLog && (
        <div className="prev-session-banner">
          <span className="text-muted text-sm">
            Edellinen: {format(parseISO(prevLog.date), 'EEEE d.M.', { locale: fi })}
            {prevLog.durationMinutes ? ` · ${prevLog.durationMinutes} min` : ''}
          </span>
        </div>
      )}

      {exercises.map((ex, exIdx) => {
        const templateEx =
          day.exercises.find((e) => e.id === ex.exerciseId) ||
          day.exercises.find((e) => e.id === ex.originalExerciseId);
        const options = templateEx ? getExerciseOptions(templateEx) : [];
        const hasAlternatives = options.length > 1;
        const prevEx = getPreviousExercise(ex.exerciseName);
        const isExpanded = expandedExercises.has(exIdx);

        // Get the current exercise option for display of its specific parameters
        const currentOption = options.find((o) => o.name === ex.exerciseName);

        // Find links from the template exercise
        const exerciseLinks = templateEx?.links;
        const hasTemplateInfo = !!(templateEx?.notes || (exerciseLinks && exerciseLinks.length > 0));

        return (
          <div key={`${ex.exerciseId}-${exIdx}`} className="card">
            {/* Clickable exercise header - always visible */}
            <div
              className="exercise-logger-header"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleExercise(exIdx)}
            >
              <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                <span className="exercise-number">{exIdx + 1}.</span>
                <div>
                  <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                    <strong>{ex.exerciseName}</strong>
                    {ex.wasSubstitute && (
                      <span className="badge badge-warning">korvaava</span>
                    )}
                  </div>
                  {ex.equipment && (
                    <span className="text-muted text-sm">{ex.equipment}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                <span className="badge">
                  {currentOption?.sets ?? templateEx?.sets ?? '?'}×{currentOption?.reps ?? templateEx?.reps ?? '?'}
                </span>
                {/* Weight summary when collapsed */}
                {!isExpanded && ex.sets.some((s) => s.weight > 0) && (
                  <span className="text-muted text-sm">
                    {ex.sets.filter((s) => s.weight > 0).map((s) => `${s.weight}kg`).join('/')}
                  </span>
                )}
                <span className="text-muted">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <>
                {/* Move buttons */}
                <div className="flex gap-sm mb-1 mt-1">
                  <div className="move-buttons" style={{ flexDirection: 'row', gap: '0.5rem' }}>
                    <button className="btn-icon" onClick={() => moveExercise(exIdx, -1)} disabled={exIdx === 0} title="Siirrä ylös">▲</button>
                    <button className="btn-icon" onClick={() => moveExercise(exIdx, 1)} disabled={exIdx === exercises.length - 1} title="Siirrä alas">▼</button>
                  </div>
                </div>

                {/* Alternative exercise selector */}
                {hasAlternatives && (
                  <select
                    className="exercise-select mb-1"
                    value={ex.exerciseName}
                    onChange={(e) => {
                      const option = options.find((o) => o.name === e.target.value);
                      if (option) switchExercise(exIdx, option);
                    }}
                  >
                    {options.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name}{opt.equipment ? ` (${opt.equipment})` : ''}{opt.isAlternative ? ' — vaihtoehto' : ''}
                      </option>
                    ))}
                  </select>
                )}

                {/* Previous data */}
                {prevEx && (
                  <div className="mb-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => togglePrevious(exIdx)}>
                      {showPrevious.has(exIdx) ? '▲ Piilota' : '▼ Edellinen'}
                    </button>
                    {showPrevious.has(exIdx) && (
                      <div className="previous-data">
                        <span className="text-sm">
                          {prevEx.sets.map((s) => `${s.weight}kg×${s.reps}`).join(' / ')}
                        </span>
                        {prevEx.notes && (
                          <span className="text-muted text-sm"> — {prevEx.notes}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Set logging */}
                <div className="set-row set-row-header">
                  <span className="set-num">#</span>
                  <span className="text-muted text-sm">kg</span>
                  <span className="text-muted text-sm">Toistot</span>
                  <span></span>
                </div>

                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className="set-row">
                    <span className="set-num">{setIdx + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={set.weight || ''}
                      min={0}
                      step={0.5}
                      placeholder="0"
                      onChange={(e) =>
                        updateSet(exIdx, setIdx, { weight: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps || ''}
                      min={0}
                      placeholder="0"
                      onChange={(e) =>
                        updateSet(exIdx, setIdx, { reps: parseInt(e.target.value) || 0 })
                      }
                    />
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.25rem' }}
                      onClick={() => removeSet(exIdx, setIdx)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button className="btn btn-ghost btn-sm mt-1" onClick={() => addSet(exIdx)}>
                  + Sarja
                </button>

                {/* Per-exercise notes */}
                <input
                  type="text"
                  value={ex.notes || ''}
                  onChange={(e) => updateExerciseNotes(exIdx, e.target.value)}
                  placeholder="Muistiinpano..."
                  className="exercise-note-input mt-1"
                />

                {/* Template notes + links behind sub-toggle */}
                {hasTemplateInfo && (
                  <div className="mt-1">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleTemplateInfo(exIdx)}
                    >
                      {showTemplateInfo.has(exIdx) ? '▲ Piilota ohjeet' : '▼ Ohjeet ja linkit'}
                    </button>
                    {showTemplateInfo.has(exIdx) && (
                      <div className="mt-1">
                        {templateEx?.notes && (
                          <div className="text-muted text-sm" style={{ fontStyle: 'italic' }}>
                            {templateEx.notes}
                          </div>
                        )}
                        {exerciseLinks && exerciseLinks.length > 0 && (
                          <div className="exercise-links mt-1">
                            {exerciseLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="exercise-link-chip"
                              >
                                {getLinkLabel(link)}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Treenin muistiinpanot</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Miltä treeni tuntui..."
          />
        </div>
      </div>

      <div className="flex gap-sm mb-2 flex-wrap">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Tallennetaan...' : 'Tallenna treeni'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={handleSkip}
          disabled={saving}
        >
          Skippaa
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Peruuta
        </button>
      </div>
    </div>
  );
}

function getLinkLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'YouTube';
    if (hostname.includes('instagram')) return 'Instagram';
    return hostname.split('.')[0];
  } catch {
    return 'Linkki';
  }
}
