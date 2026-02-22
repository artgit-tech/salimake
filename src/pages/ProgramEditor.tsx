import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { useData } from '../contexts/DataContext';
import type { Program, WorkoutDay, Exercise, AlternativeExercise, ExerciseTemplate } from '../types';

function createAlternative(parent?: Exercise): AlternativeExercise {
  return {
    id: uuid(),
    name: '',
    equipment: '',
    sets: parent?.sets ?? 3,
    reps: parent?.reps ?? '10',
    restSeconds: parent?.restSeconds ?? 90,
    notes: '',
    links: [],
  };
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
    links: [],
    alternatives: [],
  };
}

function exerciseFromTemplate(template: ExerciseTemplate): Exercise {
  return {
    id: uuid(),
    name: template.name,
    equipment: template.equipment || '',
    sets: template.sets,
    reps: template.reps,
    restSeconds: template.restSeconds,
    notes: template.notes || '',
    links: [...(template.links || [])],
    alternatives: (template.alternatives || []).map((a) => ({ ...a, id: uuid() })),
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

// --- SVG Icon components ---

function IconPencil({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconLink({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconBookmark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function IconChevron({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconChevronUp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

// --- Main component ---

export default function ProgramEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { programs, saveProgram, exerciseTemplates, saveExerciseTemplate, loading } = useData();
  const existing = id ? programs.find((p) => p.id === id) : undefined;

  const [program, setProgram] = useState<Program>(existing ?? createProgram());
  const [collapsedExercises, setCollapsedExercises] = useState<Set<string>>(new Set());
  const [showTemplatePicker, setShowTemplatePicker] = useState<{ dayIdx: number } | null>(null);
  const [templateFilter, setTemplateFilter] = useState('');

  // Drag & drop state
  const dragItem = useRef<{ dayIdx: number; exIdx: number } | null>(null);
  const dragOverItem = useRef<{ dayIdx: number; exIdx: number } | null>(null);
  const [draggingEx, setDraggingEx] = useState<{ dayIdx: number; exIdx: number } | null>(null);
  const [dragOverEx, setDragOverEx] = useState<{ dayIdx: number; exIdx: number } | null>(null);

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

  const addExerciseFromTemplate = (dayIdx: number, template: ExerciseTemplate) => {
    setProgram((prev) => {
      const days = [...prev.days];
      days[dayIdx] = {
        ...days[dayIdx],
        exercises: [...days[dayIdx].exercises, exerciseFromTemplate(template)],
      };
      return { ...prev, days };
    });
    setShowTemplatePicker(null);
    setTemplateFilter('');
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
      const parent = exercises[exIdx];
      const alts = [...(parent.alternatives || []), createAlternative(parent)];
      exercises[exIdx] = { ...parent, alternatives: alts };
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

  // --- Links ---
  const addLink = (dayIdx: number, exIdx: number, url: string) => {
    if (!url.trim()) return;
    updateExercise(dayIdx, exIdx, {
      links: [...(program.days[dayIdx].exercises[exIdx].links || []), url.trim()],
    });
  };

  const removeLink = (dayIdx: number, exIdx: number, linkIdx: number) => {
    const links = (program.days[dayIdx].exercises[exIdx].links || []).filter((_, i) => i !== linkIdx);
    updateExercise(dayIdx, exIdx, { links });
  };

  // --- Drag & drop reordering ---
  const handleDragStart = (dayIdx: number, exIdx: number) => {
    dragItem.current = { dayIdx, exIdx };
    setDraggingEx({ dayIdx, exIdx });
  };

  const handleDragEnter = (dayIdx: number, exIdx: number) => {
    dragOverItem.current = { dayIdx, exIdx };
    setDragOverEx({ dayIdx, exIdx });
  };

  const handleDragEnd = () => {
    if (dragItem.current && dragOverItem.current) {
      const { dayIdx: fromDay, exIdx: fromEx } = dragItem.current;
      const { dayIdx: toDay, exIdx: toEx } = dragOverItem.current;

      if (fromDay === toDay && fromEx !== toEx) {
        setProgram((prev) => {
          const days = [...prev.days];
          const exercises = [...days[fromDay].exercises];
          const [movedItem] = exercises.splice(fromEx, 1);
          exercises.splice(toEx, 0, movedItem);
          days[fromDay] = { ...days[fromDay], exercises };
          return { ...prev, days };
        });
      }
    }

    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingEx(null);
    setDragOverEx(null);
  };

  // --- Mobile reorder ---
  const moveExercise = (dayIdx: number, exIdx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? exIdx - 1 : exIdx + 1;
    setProgram((prev) => {
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises];
      if (newIdx < 0 || newIdx >= exercises.length) return prev;
      [exercises[exIdx], exercises[newIdx]] = [exercises[newIdx], exercises[exIdx]];
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const toggleCollapsed = (exerciseId: string) => {
    setCollapsedExercises((prev) => {
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

  // Filtered templates for picker
  const filteredTemplates = templateFilter
    ? exerciseTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(templateFilter.toLowerCase()) ||
          (t.category || '').toLowerCase().includes(templateFilter.toLowerCase())
      )
    : exerciseTemplates;

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
            <ExerciseEditor
              key={ex.id}
              ex={ex}
              exIdx={exIdx}
              dayIdx={dayIdx}
              isCollapsed={collapsedExercises.has(ex.id)}
              onToggleCollapsed={() => toggleCollapsed(ex.id)}
              onUpdate={(partial) => updateExercise(dayIdx, exIdx, partial)}
              onRemove={() => removeExercise(dayIdx, exIdx)}
              onDragStart={() => handleDragStart(dayIdx, exIdx)}
              onDragEnter={() => handleDragEnter(dayIdx, exIdx)}
              onDragEnd={handleDragEnd}
              onAddAlternative={() => addAlternative(dayIdx, exIdx)}
              onUpdateAlternative={(altIdx, partial) => updateAlternative(dayIdx, exIdx, altIdx, partial)}
              onRemoveAlternative={(altIdx) => removeAlternative(dayIdx, exIdx, altIdx)}
              onAddLink={(url) => addLink(dayIdx, exIdx, url)}
              onRemoveLink={(linkIdx) => removeLink(dayIdx, exIdx, linkIdx)}
              onSaveToLibrary={() => {
                const template = {
                  id: uuid(),
                  name: ex.name,
                  equipment: ex.equipment || undefined,
                  sets: ex.sets,
                  reps: ex.reps,
                  restSeconds: ex.restSeconds,
                  notes: ex.notes || undefined,
                  links: ex.links?.length ? [...ex.links] : undefined,
                  alternatives: ex.alternatives?.length
                    ? ex.alternatives.map((a) => ({ ...a }))
                    : undefined,
                };
                saveExerciseTemplate(template).then(() => {
                  alert(`"${ex.name}" tallennettu kirjastoon!`);
                }).catch(() => {
                  alert('Tallentaminen kirjastoon epäonnistui.');
                });
              }}
              isDragging={draggingEx?.dayIdx === dayIdx && draggingEx?.exIdx === exIdx}
              isDragOver={
                dragOverEx?.dayIdx === dayIdx &&
                dragOverEx?.exIdx === exIdx &&
                !(draggingEx?.dayIdx === dayIdx && draggingEx?.exIdx === exIdx)
              }
              onMoveUp={() => moveExercise(dayIdx, exIdx, 'up')}
              onMoveDown={() => moveExercise(dayIdx, exIdx, 'down')}
              canMoveUp={exIdx > 0}
              canMoveDown={exIdx < day.exercises.length - 1}
            />
          ))}

          <div className="flex gap-sm flex-wrap">
            <button className="btn btn-ghost btn-sm" onClick={() => addExercise(dayIdx)}>
              + Tyhjä liike
            </button>
            {exerciseTemplates.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowTemplatePicker({ dayIdx })}
              >
                + Lisää kirjastosta
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Template picker modal */}
      {showTemplatePicker && (
        <div className="modal-overlay" onClick={() => { setShowTemplatePicker(null); setTemplateFilter(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Valitse liiketemplate</h2>
            <div className="form-group">
              <input
                type="text"
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                placeholder="Hae nimellä tai kategorialla..."
                autoFocus
              />
            </div>
            {filteredTemplates.length === 0 ? (
              <p className="text-muted text-sm">Ei tuloksia.</p>
            ) : (
              filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  className="template-picker-item"
                  onClick={() => addExerciseFromTemplate(showTemplatePicker.dayIdx, t)}
                >
                  <strong>{t.name}</strong>
                  <span className="text-muted text-sm">
                    {t.equipment && `${t.equipment} · `}
                    {t.sets}×{t.reps}
                    {t.category && ` · ${t.category}`}
                  </span>
                </div>
              ))
            )}
            <button className="btn btn-ghost mt-2" onClick={() => { setShowTemplatePicker(null); setTemplateFilter(''); }}>
              Peruuta
            </button>
          </div>
        </div>
      )}

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

// --- Exercise editor component ---

interface ExerciseEditorProps {
  ex: Exercise;
  exIdx: number;
  dayIdx: number;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onUpdate: (partial: Partial<Exercise>) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onAddAlternative: () => void;
  onUpdateAlternative: (altIdx: number, partial: Partial<AlternativeExercise>) => void;
  onRemoveAlternative: (altIdx: number) => void;
  onAddLink: (url: string) => void;
  onRemoveLink: (linkIdx: number) => void;
  onSaveToLibrary: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function ExerciseEditor({
  ex,
  exIdx,
  isCollapsed,
  onToggleCollapsed,
  onUpdate,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onAddAlternative,
  onUpdateAlternative,
  onRemoveAlternative,
  onAddLink,
  onRemoveLink,
  onSaveToLibrary,
  isDragging,
  isDragOver,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ExerciseEditorProps) {
  const [linkInput, setLinkInput] = useState('');
  const [editingAltIdx, setEditingAltIdx] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(() => {
    return Boolean(ex.notes?.trim() || (ex.links && ex.links.length > 0));
  });
  const [altLinkInput, setAltLinkInput] = useState('');

  const summary = `${ex.sets}×${ex.reps}`;
  const notesCount = (ex.notes?.trim() ? 1 : 0) + (ex.links?.length ?? 0);

  // Reps increment/decrement for parent exercise
  const incrementReps = () => {
    const num = parseInt(ex.reps);
    if (!isNaN(num)) onUpdate({ reps: String(num + 1) });
  };
  const decrementReps = () => {
    const num = parseInt(ex.reps);
    if (!isNaN(num) && num > 1) onUpdate({ reps: String(num - 1) });
  };

  const openAltEdit = (idx: number) => {
    setEditingAltIdx(idx);
    setAltLinkInput('');
  };

  const closeAltEdit = () => {
    setEditingAltIdx(null);
    setAltLinkInput('');
  };

  return (
    <div
      className={`exercise-row${isDragging ? ' exercise-row-dragging' : ''}${isDragOver ? ' exercise-row-drag-over' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="exercise-header">
        <div className="flex gap-sm" style={{ alignItems: 'center', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={onToggleCollapsed}>
          <span className="drag-handle" title="Raahaa järjestääksesi" onClick={(e) => e.stopPropagation()}>⠿</span>
          <div className="move-buttons" onClick={(e) => e.stopPropagation()}>
            <button className="move-btn" onClick={onMoveUp} disabled={!canMoveUp} title="Siirrä ylös">
              <IconChevronUp size={14} />
            </button>
            <button className="move-btn" onClick={onMoveDown} disabled={!canMoveDown} title="Siirrä alas">
              <IconChevron size={14} />
            </button>
          </div>
          <span className="exercise-number">{exIdx + 1}</span>
          {isCollapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{ex.name || <span className="text-muted">Nimetön liike</span>}</span>
              <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>{summary}</span>
            </div>
          )}
        </div>
        <button
          className="btn-trash"
          onClick={onRemove}
          title="Poista liike"
          aria-label="Poista liike"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Name + Equipment */}
          <div className="exercise-fields-2col">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Liikkeen nimi</label>
              <input
                type="text"
                className="exercise-name-input"
                value={ex.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="esim. Penkkipunnerrus"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Väline / suoritustapa</label>
              <input
                type="text"
                value={ex.equipment || ''}
                onChange={(e) => onUpdate({ equipment: e.target.value })}
                placeholder="esim. rintaprässi"
              />
            </div>
          </div>

          {/* Sets + Reps with labels and steppers */}
          <div className="exercise-fields-2col" style={{ marginTop: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Sarjat</label>
              <div className="stepper">
                <button className="stepper-btn" onClick={() => onUpdate({ sets: Math.max(1, ex.sets - 1) })}>−</button>
                <input type="number" value={ex.sets} min={1} onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 1 })} />
                <button className="stepper-btn" onClick={() => onUpdate({ sets: ex.sets + 1 })}>+</button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Toistot</label>
              <div className="stepper">
                <button className="stepper-btn" onClick={decrementReps}>−</button>
                <input type="text" value={ex.reps} onChange={(e) => onUpdate({ reps: e.target.value })} />
                <button className="stepper-btn" onClick={incrementReps}>+</button>
              </div>
            </div>
          </div>

          {/* --- Lisäohjeet accordion --- */}
          <div className="section-divider">
            <button className="notes-accordion-toggle" onClick={() => setShowNotes(!showNotes)}>
              <IconChevron size={14} className={`accordion-chevron${showNotes ? ' accordion-chevron-open' : ''}`} />
              <span>Lisäohjeet</span>
              {notesCount > 0 && (
                <span className="badge badge-xs">{notesCount}</span>
              )}
            </button>

            {showNotes && (
              <div className="accordion-content" style={{ marginTop: '0.5rem' }}>
                {/* Notes with pencil icon */}
                <div className="field-with-icon">
                  <span className="field-icon"><IconPencil size={14} /></span>
                  <input
                    type="text"
                    value={ex.notes || ''}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    placeholder="Muistiinpanot, suoritusvinkit..."
                    style={{ flex: 1 }}
                  />
                </div>

                {/* Links with link icon */}
                <div style={{ marginTop: '0.5rem' }}>
                  {(ex.links || []).map((link, idx) => (
                    <div key={idx} className="flex gap-sm mb-1" style={{ alignItems: 'center', paddingLeft: '1.75rem' }}>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm link-truncate">
                        {link}
                      </a>
                      <button className="btn-trash" onClick={() => onRemoveLink(idx)} title="Poista linkki">×</button>
                    </div>
                  ))}
                  <div className="field-with-icon">
                    <span className="field-icon"><IconLink size={14} /></span>
                    <input
                      type="text"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="Lisää linkki (esim. YouTube)..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && linkInput.trim()) {
                          onAddLink(linkInput);
                          setLinkInput('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { if (linkInput.trim()) { onAddLink(linkInput); setLinkInput(''); } }}
                    >
                      Lisää
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- Vaihtoehtoiset liikkeet --- */}
          <div className="section-divider">
            <div className="alt-section-title">
              Vaihtoehtoiset liikkeet
              {(ex.alternatives?.length ?? 0) > 0 && (
                <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>({ex.alternatives!.length})</span>
              )}
            </div>

            {(ex.alternatives || []).map((alt, altIdx) => {
              const altSets = alt.sets ?? ex.sets;
              const altReps = alt.reps ?? ex.reps;

              return (
                <div key={alt.id}>
                  {editingAltIdx === altIdx ? (
                    /* --- Expanded alternative edit --- */
                    <div className="alt-compact-edit mb-1">
                      <div className="exercise-fields-2col">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Nimi</label>
                          <input
                            type="text"
                            value={alt.name}
                            onChange={(e) => onUpdateAlternative(altIdx, { name: e.target.value })}
                            placeholder="Liikkeen nimi"
                            autoFocus
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Väline</label>
                          <input
                            type="text"
                            value={alt.equipment || ''}
                            onChange={(e) => onUpdateAlternative(altIdx, { equipment: e.target.value })}
                            placeholder="Väline"
                          />
                        </div>
                      </div>
                      <div className="exercise-fields-2col" style={{ marginTop: '0.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Sarjat</label>
                          <div className="stepper">
                            <button className="stepper-btn" onClick={() => onUpdateAlternative(altIdx, { sets: Math.max(1, altSets - 1) })}>−</button>
                            <input type="number" value={altSets} min={1} onChange={(e) => onUpdateAlternative(altIdx, { sets: parseInt(e.target.value) || 1 })} />
                            <button className="stepper-btn" onClick={() => onUpdateAlternative(altIdx, { sets: altSets + 1 })}>+</button>
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Toistot</label>
                          <div className="stepper">
                            <button className="stepper-btn" onClick={() => {
                              const n = parseInt(altReps);
                              if (!isNaN(n) && n > 1) onUpdateAlternative(altIdx, { reps: String(n - 1) });
                            }}>−</button>
                            <input type="text" value={altReps} onChange={(e) => onUpdateAlternative(altIdx, { reps: e.target.value })} />
                            <button className="stepper-btn" onClick={() => {
                              const n = parseInt(altReps);
                              if (!isNaN(n)) onUpdateAlternative(altIdx, { reps: String(n + 1) });
                            }}>+</button>
                          </div>
                        </div>
                      </div>

                      {/* Alt notes */}
                      <div className="field-with-icon" style={{ marginTop: '0.5rem' }}>
                        <span className="field-icon"><IconPencil size={14} /></span>
                        <input
                          type="text"
                          value={alt.notes || ''}
                          onChange={(e) => onUpdateAlternative(altIdx, { notes: e.target.value })}
                          placeholder="Muistiinpanot..."
                          style={{ flex: 1 }}
                        />
                      </div>

                      {/* Alt links */}
                      <div style={{ marginTop: '0.5rem' }}>
                        {(alt.links || []).map((link, linkIdx) => (
                          <div key={linkIdx} className="flex gap-sm mb-1" style={{ alignItems: 'center', paddingLeft: '1.75rem' }}>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm link-truncate">
                              {link}
                            </a>
                            <button
                              className="btn-trash"
                              onClick={() => {
                                const links = (alt.links || []).filter((_, i) => i !== linkIdx);
                                onUpdateAlternative(altIdx, { links });
                              }}
                            >×</button>
                          </div>
                        ))}
                        <div className="field-with-icon">
                          <span className="field-icon"><IconLink size={14} /></span>
                          <input
                            type="text"
                            value={altLinkInput}
                            onChange={(e) => setAltLinkInput(e.target.value)}
                            placeholder="Lisää linkki..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && altLinkInput.trim()) {
                                onUpdateAlternative(altIdx, { links: [...(alt.links || []), altLinkInput.trim()] });
                                setAltLinkInput('');
                              }
                            }}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              if (altLinkInput.trim()) {
                                onUpdateAlternative(altIdx, { links: [...(alt.links || []), altLinkInput.trim()] });
                                setAltLinkInput('');
                              }
                            }}
                          >Lisää</button>
                        </div>
                      </div>

                      {/* Alt bottom actions */}
                      <div className="alt-edit-actions">
                        <button className="btn btn-primary" onClick={closeAltEdit}>
                          Tallenna
                        </button>
                        <button className="btn btn-danger" onClick={() => { onRemoveAlternative(altIdx); closeAltEdit(); }}>
                          Poista
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* --- Compact alternative one-liner --- */
                    <div className="alt-compact-item mb-1" onClick={() => openAltEdit(altIdx)}>
                      <span className="alt-compact-name">
                        {alt.name || <span className="text-muted">Nimetön</span>}
                      </span>
                      {alt.equipment && (
                        <span className="text-muted text-sm">{alt.equipment}</span>
                      )}
                      <span className="text-muted text-sm">{altSets}×{altReps}</span>
                      <button
                        className="btn-trash"
                        onClick={(e) => { e.stopPropagation(); onRemoveAlternative(altIdx); }}
                        title="Poista vaihtoehto"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom actions: Lisää vaihtoehto (left) + Tallenna kirjastoon (right) */}
            <div className="exercise-bottom-actions">
              <button className="btn btn-ghost btn-sm btn-tall" onClick={onAddAlternative}>
                + Lisää vaihtoehto
              </button>
              <button
                className="btn btn-save-library btn-sm btn-tall"
                onClick={onSaveToLibrary}
                disabled={!ex.name.trim()}
              >
                <IconBookmark size={14} />
                Tallenna kirjastoon
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
