import { useState, useEffect, useRef, useCallback } from 'react';
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

// Key for localStorage draft
const DRAFT_KEY = (programId: string, dayId: string) =>
  `salimake_draft_${programId}_${dayId}`;

interface DraftData {
  exercises: LoggedExercise[];
  notes: string;
  savedAt: string;
}

export default function WorkoutLogger() {
  const { programId, dayId } = useParams<{ programId: string; dayId: string }>();
  const navigate = useNavigate();
  const { programs, workoutLogs, saveWorkoutLog, deleteWorkoutLog, loading } = useData();
  const program = programs.find((p) => p.id === programId);
  const day = program?.days.find((d) => d.id === dayId);
  const startTime = useRef(Date.now());

  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [showTemplateInfo, setShowTemplateInfo] = useState<Set<number>>(new Set());
  const [draftStatus, setDraftStatus] = useState<string>('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyLimit, setHistoryLimit] = useState<Map<number, number>>(new Map());

  // Per-exercise editing state: exIdx -> editing info
  const [editingHistory, setEditingHistory] = useState<Map<number, {
    logId: string;
    date: string;
    backupSets: LoggedSet[];
    backupNotes: string;
  }>>(new Map());

  // Per-exercise save tracking
  const [savedExercises, setSavedExercises] = useState<Set<number>>(new Set());
  const sessionLogId = useRef<string | null>(null);

  // Get previous logs for this day (exclude whole-workout skipped), sorted by date descending
  const prevLogs = workoutLogs
    .filter((l) => l.programId === programId && l.dayId === dayId && !l.skipped)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const prevLog = prevLogs[0];

  useEffect(() => {
    if (!day || !programId || !dayId) return;

    // Try to restore draft
    const draftKey = DRAFT_KEY(programId, dayId);
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft: DraftData = JSON.parse(savedDraft);
        if (draft.exercises.length > 0) {
          setExercises(draft.exercises);
          setNotes(draft.notes || '');
          setDraftStatus('Luonnos palautettu');
          setTimeout(() => setDraftStatus(''), 2000);
          return;
        }
      } catch { /* ignore bad draft */ }
    }

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
  }, [day, programId, dayId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to localStorage on every change
  const saveDraft = useCallback(() => {
    if (!programId || !dayId || exercises.length === 0) return;
    const draft: DraftData = {
      exercises,
      notes,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY(programId, dayId), JSON.stringify(draft));
    setDraftStatus('Tallennettu');
    setTimeout(() => setDraftStatus(''), 1500);
  }, [exercises, notes, programId, dayId]);

  // Debounced auto-save: save 1s after last change
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (exercises.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft();
    }, 1000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [exercises, notes, saveDraft]);

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

  // Get all results for a specific exercise across all previous logs
  // Returns newest first (same order as prevLogs)
  const getAllHistory = (exerciseName: string, exerciseId: string) => {
    const results: {
      logId: string;
      date: string;
      sets: LoggedSet[];
      notes?: string;
      wasSubstitute?: boolean;
      exerciseName: string;
      workoutNotes?: string;
      exerciseIndex: number;
      skipped?: boolean;
    }[] = [];

    for (const log of prevLogs) {
      const loggedExIdx = log.exercises.findIndex(
        (pe) =>
          pe.exerciseName === exerciseName ||
          pe.exerciseId === exerciseId ||
          pe.originalExerciseId === exerciseId
      );
      if (loggedExIdx !== -1) {
        const loggedEx = log.exercises[loggedExIdx];
        results.push({
          logId: log.id,
          date: log.date,
          sets: loggedEx.sets,
          notes: loggedEx.notes,
          wasSubstitute: loggedEx.wasSubstitute,
          exerciseName: loggedEx.exerciseName,
          workoutNotes: log.notes,
          exerciseIndex: loggedExIdx,
          skipped: loggedEx.skipped,
        });
      }
    }
    return results;
  };

  // Start editing a historical entry for a specific exercise
  const startEditingHistory = (exIdx: number, entry: {
    logId: string;
    date: string;
    sets: LoggedSet[];
    notes?: string;
    exerciseIndex: number;
  }) => {
    const current = exercises[exIdx];
    setEditingHistory((prev) => {
      const next = new Map(prev);
      next.set(exIdx, {
        logId: entry.logId,
        date: entry.date,
        backupSets: current.sets.map((s) => ({ ...s })),
        backupNotes: current.notes || '',
      });
      return next;
    });
    // Load the historical sets into the current exercise
    setExercises((prev) => {
      const copy = [...prev];
      copy[exIdx] = {
        ...copy[exIdx],
        sets: entry.sets.map((s) => ({ ...s })),
        notes: entry.notes || '',
      };
      return copy;
    });
  };

  // Cancel editing a historical entry
  const cancelEditingHistory = (exIdx: number) => {
    const editing = editingHistory.get(exIdx);
    if (!editing) return;
    // Restore backup
    setExercises((prev) => {
      const copy = [...prev];
      copy[exIdx] = {
        ...copy[exIdx],
        sets: editing.backupSets,
        notes: editing.backupNotes,
      };
      return copy;
    });
    setEditingHistory((prev) => {
      const next = new Map(prev);
      next.delete(exIdx);
      return next;
    });
  };

  // Save edited historical entry
  const saveEditedHistory = async (exIdx: number) => {
    const editing = editingHistory.get(exIdx);
    if (!editing || saving) return;
    setSaving(true);
    try {
      const log = workoutLogs.find((l) => l.id === editing.logId);
      if (!log) throw new Error('Log not found');
      const updatedExercises = [...log.exercises];
      const targetIdx = updatedExercises.findIndex(
        (pe) =>
          pe.exerciseName === exercises[exIdx].exerciseName ||
          pe.exerciseId === exercises[exIdx].exerciseId ||
          pe.originalExerciseId === exercises[exIdx].exerciseId
      );
      if (targetIdx !== -1) {
        updatedExercises[targetIdx] = {
          ...updatedExercises[targetIdx],
          sets: exercises[exIdx].sets.map((s) => ({ ...s })),
          notes: exercises[exIdx].notes || undefined,
        };
      }
      const updatedLog: WorkoutLog = {
        ...log,
        date: editing.date,
        exercises: updatedExercises,
      };
      await saveWorkoutLog(updatedLog);
      cancelEditingHistory(exIdx);
    } catch (err) {
      console.error('Muokkauksen tallennus epäonnistui:', err);
      alert('Muokkauksen tallentaminen epäonnistui.');
    } finally {
      setSaving(false);
    }
  };

  // Delete a historical exercise entry
  const deleteHistoryExercise = async (exIdx: number) => {
    const editing = editingHistory.get(exIdx);
    if (!editing || saving) return;
    if (!window.confirm('Haluatko varmasti poistaa tämän merkinnän? Tätä ei voi perua.')) return;
    setSaving(true);
    try {
      const log = workoutLogs.find((l) => l.id === editing.logId);
      if (!log) throw new Error('Log not found');
      const updatedExercises = log.exercises.filter(
        (pe) =>
          pe.exerciseName !== exercises[exIdx].exerciseName &&
          pe.exerciseId !== exercises[exIdx].exerciseId &&
          pe.originalExerciseId !== exercises[exIdx].exerciseId
      );
      if (updatedExercises.length === 0) {
        // No exercises left — delete the entire log
        await deleteWorkoutLog(log.id);
      } else {
        const updatedLog: WorkoutLog = {
          ...log,
          exercises: updatedExercises,
        };
        await saveWorkoutLog(updatedLog);
      }
      cancelEditingHistory(exIdx);
    } catch (err) {
      console.error('Merkinnän poisto epäonnistui:', err);
      alert('Merkinnän poistaminen epäonnistui.');
    } finally {
      setSaving(false);
    }
  };

  // Save a single exercise individually (or skip it)
  const saveExerciseIndividually = async (exIdx: number, skipped: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const ex = exercises[exIdx];
      const exerciseEntry: LoggedExercise = {
        ...ex,
        orderIndex: exIdx,
        notes: ex.notes || undefined,
        skipped: skipped || undefined,
        sets: skipped ? [] : ex.sets.map((s) => ({ ...s })),
      };

      if (sessionLogId.current) {
        // Update existing session log
        const existingLog = workoutLogs.find((l) => l.id === sessionLogId.current);
        if (existingLog) {
          const updatedExercises = [...existingLog.exercises];
          const existIdx = updatedExercises.findIndex(
            (pe) => pe.exerciseId === ex.exerciseId || pe.exerciseName === ex.exerciseName
          );
          if (existIdx !== -1) {
            updatedExercises[existIdx] = exerciseEntry;
          } else {
            updatedExercises.push(exerciseEntry);
          }
          const updatedLog: WorkoutLog = {
            ...existingLog,
            date: workoutDate,
            exercises: updatedExercises,
            durationMinutes: Math.round((Date.now() - startTime.current) / 60000),
            notes: notes || undefined,
          };
          await saveWorkoutLog(updatedLog);
        }
      } else {
        // Create new session log
        const logId = uuid();
        sessionLogId.current = logId;
        const log: WorkoutLog = {
          id: logId,
          programId: program.id,
          dayId: day.id,
          dayName: `${program.name} — ${day.name}`,
          date: workoutDate,
          exercises: [exerciseEntry],
          durationMinutes: Math.round((Date.now() - startTime.current) / 60000),
          notes: notes || undefined,
        };
        await saveWorkoutLog(log);
      }

      setSavedExercises((prev) => new Set(prev).add(exIdx));
    } catch (err) {
      console.error('Liikkeen tallennus epäonnistui:', err);
      alert('Tallentaminen epäonnistui. Yritä uudelleen.');
    } finally {
      setSaving(false);
    }
  };

  // Save entire workout
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const durationMinutes = Math.round((Date.now() - startTime.current) / 60000);
      const logId = sessionLogId.current || uuid();

      const log: WorkoutLog = {
        id: logId,
        programId: program.id,
        dayId: day.id,
        dayName: `${program.name} — ${day.name}`,
        date: workoutDate,
        exercises: exercises.map((ex, i) => ({
          ...ex,
          orderIndex: i,
          notes: ex.notes || undefined,
        })),
        durationMinutes,
        notes: notes || undefined,
      };

      await saveWorkoutLog(log);
      if (programId && dayId) {
        localStorage.removeItem(DRAFT_KEY(programId, dayId));
      }
      navigate('/history');
    } catch (err) {
      console.error('Tallennus epäonnistui:', err);
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
        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
          {draftStatus && (
            <span className="text-sm draft-status">{draftStatus}</span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/programs/${programId}`)}
            title="Muokkaa ohjelmaa"
          >
            Muokkaa
          </button>
        </div>
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
        const isExpanded = expandedExercises.has(exIdx);
        const isSaved = savedExercises.has(exIdx);

        // Get the current exercise option for display of its specific parameters
        const currentOption = options.find((o) => o.name === ex.exerciseName);

        // Find links from the template exercise
        const exerciseLinks = templateEx?.links;
        const hasTemplateInfo = !!(templateEx?.notes || (exerciseLinks && exerciseLinks.length > 0));

        // Get all history for this exercise (newest first)
        const allHistory = getAllHistory(ex.exerciseName, ex.exerciseId);
        const limit = historyLimit.get(exIdx) ?? 4;
        const visibleHistory = allHistory.slice(0, limit);
        const hasMore = allHistory.length > limit;

        return (
          <div key={`${ex.exerciseId}-${exIdx}`} className={`card${isSaved ? ' card-saved' : ''}`}>
            {/* Clickable exercise header - always visible */}
            <div
              className="exercise-logger-header"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleExercise(exIdx)}
            >
              <div className="exercise-header-left">
                <span className="exercise-number">{exIdx + 1}.</span>
                <div style={{ minWidth: 0 }}>
                  <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ wordBreak: 'break-word' }}>{ex.exerciseName}</strong>
                    {ex.wasSubstitute && (
                      <span className="badge badge-warning">korvaava</span>
                    )}
                  </div>
                  {ex.equipment && (
                    <span className="text-muted text-sm">{ex.equipment}</span>
                  )}
                </div>
              </div>
              <div className="exercise-header-right">
                {isSaved && (
                  <span className="badge badge-success">tallennettu</span>
                )}
                <span className="badge">
                  {currentOption?.sets ?? templateEx?.sets ?? '?'}×{currentOption?.reps ?? templateEx?.reps ?? '?'}
                </span>
                {/* Weight summary when collapsed */}
                {!isExpanded && ex.sets.some((s) => s.weight > 0) && (
                  <span className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
                    {ex.sets.filter((s) => s.weight > 0).map((s) => `${s.weight}kg`).join('/')}
                  </span>
                )}
                <svg
                  className={`accordion-chevron${isExpanded ? ' accordion-chevron-open' : ''}`}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="accordion-content">
                {/* Template notes + links - directly below title */}
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

                {/* Recent history - newest first, expandable */}
                {allHistory.length > 0 && !editingHistory.has(exIdx) && (
                  <div className="recent-history mt-1 mb-1">
                    <div className="recent-history-title">
                      Viimeisimmät tulokset ({allHistory.length})
                    </div>
                    <div className={visibleHistory.length > 6 ? 'recent-history-scroll' : ''}>
                      {visibleHistory.map((entry, hIdx) => {
                        const noteKey = `${exIdx}-${ex.exerciseId}-${entry.date}-${hIdx}`;
                        const hasNotes = !!(entry.notes || entry.workoutNotes);
                        const isNoteExpanded = expandedNotes === noteKey;
                        const isSubstitute = entry.wasSubstitute || entry.exerciseName !== templateEx?.name;

                        // Format sets compactly: if all sets identical show "3×5 @ 60kg"
                        const formatSets = (sets: { weight: number; reps: number }[]) => {
                          const allSame = sets.length > 1 && sets.every(
                            (s) => s.weight === sets[0].weight && s.reps === sets[0].reps
                          );
                          if (allSame) {
                            return `${sets.length}×${sets[0].reps} @ ${sets[0].weight} kg`;
                          }
                          return sets.map((s) => `${s.weight}×${s.reps}`).join(' / ');
                        };

                        return (
                          <div key={hIdx} className="recent-history-row">
                            <div className="recent-history-top">
                              <span className="recent-history-date">
                                {format(parseISO(entry.date), 'd.M.', { locale: fi })}
                              </span>
                              {entry.skipped ? (
                                <>
                                  <span className="badge badge-muted badge-xs">Skipattu</span>
                                  <div className="recent-history-actions">
                                    {hasNotes && (
                                      <button
                                        className="note-info-btn"
                                        onClick={() => setExpandedNotes(isNoteExpanded ? null : noteKey)}
                                        title="Muistiinpanot"
                                      >
                                        {isNoteExpanded ? '✕' : 'i'}
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-ghost btn-sm history-edit-btn"
                                      onClick={() => startEditingHistory(exIdx, entry)}
                                    >
                                      ✎
                                    </button>
                                  </div>
                                </>
                              ) : isSubstitute ? (
                                <>
                                  <span className="badge badge-warning badge-xs">{entry.exerciseName}</span>
                                  <div className="recent-history-actions">
                                    {hasNotes && (
                                      <button
                                        className="note-info-btn"
                                        onClick={() => setExpandedNotes(isNoteExpanded ? null : noteKey)}
                                        title="Muistiinpanot"
                                      >
                                        {isNoteExpanded ? '✕' : 'i'}
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-ghost btn-sm history-edit-btn"
                                      onClick={() => startEditingHistory(exIdx, entry)}
                                    >
                                      ✎
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="recent-history-sets-inline">
                                    {formatSets(entry.sets)}
                                  </span>
                                  <div className="recent-history-actions">
                                    {hasNotes && (
                                      <button
                                        className="note-info-btn"
                                        onClick={() => setExpandedNotes(isNoteExpanded ? null : noteKey)}
                                        title="Muistiinpanot"
                                      >
                                        {isNoteExpanded ? '✕' : 'i'}
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-ghost btn-sm history-edit-btn"
                                      onClick={() => startEditingHistory(exIdx, entry)}
                                    >
                                      ✎
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Sets on second row only for substitute exercises */}
                            {!entry.skipped && isSubstitute && (
                              <div className="recent-history-sets">
                                {formatSets(entry.sets)}
                              </div>
                            )}
                            {isNoteExpanded && hasNotes && (
                              <div className="recent-history-notes">
                                {entry.notes && (
                                  <span><span className="note-icon-inline">&#9998;</span> <em>{entry.notes}</em></span>
                                )}
                                {entry.workoutNotes && (
                                  <span><span className="note-icon-inline">&#9878;</span> <em>{entry.workoutNotes}</em></span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {hasMore && (
                      <button
                        className="btn btn-ghost btn-sm mt-1"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setHistoryLimit((prev) => {
                          const next = new Map(prev);
                          next.set(exIdx, limit + 6);
                          return next;
                        })}
                      >
                        Näytä lisää ({allHistory.length - limit} jäljellä)
                      </button>
                    )}
                  </div>
                )}

                {/* Logging section - visually distinct */}
                <div className="logging-section mt-1">
                  <div className="logging-section-header">
                    {editingHistory.has(exIdx) ? (
                      <div className="flex-between">
                        <span className="text-sm" style={{ fontWeight: 600 }}>Muokataan:</span>
                        <input
                          type="date"
                          className="date-input-sm"
                          value={editingHistory.get(exIdx)!.date}
                          onChange={(e) => {
                            setEditingHistory((prev) => {
                              const next = new Map(prev);
                              const current = next.get(exIdx)!;
                              next.set(exIdx, { ...current, date: e.target.value });
                              return next;
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-between">
                        <span className="text-sm text-muted" style={{ fontWeight: 500 }}>Tänään</span>
                        <input
                          type="date"
                          className="date-input-sm"
                          value={workoutDate}
                          onChange={(e) => setWorkoutDate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Alternative exercise selector - inside logging section */}
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
                        className="set-delete-btn"
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
                  <div className="exercise-note-field mt-1">
                    <span className="exercise-note-icon">&#9998;</span>
                    <input
                      type="text"
                      value={ex.notes || ''}
                      onChange={(e) => updateExerciseNotes(exIdx, e.target.value)}
                      placeholder="Lisää muistiinpano..."
                    />
                  </div>

                  {/* Action buttons */}
                  {editingHistory.has(exIdx) ? (
                    <div className="flex gap-sm mt-1" style={{ flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => saveEditedHistory(exIdx)}
                        disabled={saving}
                      >
                        {saving ? 'Tallennetaan...' : 'Tallenna muokkaus'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => cancelEditingHistory(exIdx)}
                        disabled={saving}
                      >
                        Peruuta
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteHistoryExercise(exIdx)}
                        disabled={saving}
                        style={{ marginLeft: 'auto' }}
                      >
                        Poista
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-sm mt-1">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => saveExerciseIndividually(exIdx, false)}
                        disabled={saving}
                      >
                        {saving ? 'Tallennetaan...' : 'Tallenna'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (!window.confirm(`Skipataanko "${ex.exerciseName}"?`)) return;
                          saveExerciseIndividually(exIdx, true);
                        }}
                        disabled={saving}
                      >
                        Skippaa
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
