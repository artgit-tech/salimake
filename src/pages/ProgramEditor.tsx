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

export default function ProgramEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { programs, saveProgram, exerciseTemplates, loading } = useData();
  const existing = id ? programs.find((p) => p.id === id) : undefined;

  const [program, setProgram] = useState<Program>(existing ?? createProgram());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [showTemplatePicker, setShowTemplatePicker] = useState<{ dayIdx: number } | null>(null);
  const [templateFilter, setTemplateFilter] = useState('');

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
  };

  const handleDragEnter = (dayIdx: number, exIdx: number) => {
    dragOverItem.current = { dayIdx, exIdx };
  };

  const handleDragEnd = () => {
    if (!dragItem.current || !dragOverItem.current) return;
    const { dayIdx: fromDay, exIdx: fromEx } = dragItem.current;
    const { dayIdx: toDay, exIdx: toEx } = dragOverItem.current;

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
              totalExercises={day.exercises.length}
              isExpanded={expandedExercises.has(ex.id)}
              onToggleExpanded={() => toggleExpanded(ex.id)}
              onUpdate={(partial) => updateExercise(dayIdx, exIdx, partial)}
              onRemove={() => removeExercise(dayIdx, exIdx)}
              onMove={(dir) => moveExercise(dayIdx, exIdx, dir)}
              onDragStart={() => handleDragStart(dayIdx, exIdx)}
              onDragEnter={() => handleDragEnter(dayIdx, exIdx)}
              onDragEnd={handleDragEnd}
              onAddAlternative={() => addAlternative(dayIdx, exIdx)}
              onUpdateAlternative={(altIdx, partial) => updateAlternative(dayIdx, exIdx, altIdx, partial)}
              onRemoveAlternative={(altIdx) => removeAlternative(dayIdx, exIdx, altIdx)}
              onAddLink={(url) => addLink(dayIdx, exIdx, url)}
              onRemoveLink={(linkIdx) => removeLink(dayIdx, exIdx, linkIdx)}
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

// --- Extracted exercise editor component for clarity ---

interface ExerciseEditorProps {
  ex: Exercise;
  exIdx: number;
  dayIdx: number;
  totalExercises: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (partial: Partial<Exercise>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onAddAlternative: () => void;
  onUpdateAlternative: (altIdx: number, partial: Partial<AlternativeExercise>) => void;
  onRemoveAlternative: (altIdx: number) => void;
  onAddLink: (url: string) => void;
  onRemoveLink: (linkIdx: number) => void;
}

function ExerciseEditor({
  ex,
  exIdx,
  totalExercises,
  isExpanded,
  onToggleExpanded,
  onUpdate,
  onRemove,
  onMove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onAddAlternative,
  onUpdateAlternative,
  onRemoveAlternative,
  onAddLink,
  onRemoveLink,
}: ExerciseEditorProps) {
  const [linkInput, setLinkInput] = useState('');

  return (
    <div
      className="exercise-row"
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="exercise-header">
        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
          <span className="drag-handle" title="Raahaa järjestääksesi">⠿</span>
          <span className="exercise-number">{exIdx + 1}.</span>
          <div className="move-buttons">
            <button className="btn-icon" onClick={() => onMove(-1)} disabled={exIdx === 0} title="Siirrä ylös">▲</button>
            <button className="btn-icon" onClick={() => onMove(1)} disabled={exIdx === totalExercises - 1} title="Siirrä alas">▼</button>
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={onRemove}>Poista</button>
      </div>

      <div className="exercise-fields-2col">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Liikkeen nimi</label>
          <input
            type="text"
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

      <div className="exercise-fields-4col mt-1">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Sarjat</label>
          <input type="number" value={ex.sets} min={1} onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 1 })} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Toistot</label>
          <input type="text" value={ex.reps} onChange={(e) => onUpdate({ reps: e.target.value })} placeholder="8-12" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Lepo (s)</label>
          <input type="number" value={ex.restSeconds} min={0} step={15} onChange={(e) => onUpdate({ restSeconds: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="form-group mt-1" style={{ marginBottom: 0 }}>
        <label>Muistiinpano</label>
        <input
          type="text"
          value={ex.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="esim. käsien leveys, suoritusvinkit..."
        />
      </div>

      {/* Expandable section: alternatives + links */}
      <div className="mt-1">
        <button className="btn btn-ghost btn-sm" onClick={onToggleExpanded}>
          {isExpanded ? '▲ Piilota' : '▼ Lisäasetukset'}
          {((ex.alternatives?.length ?? 0) > 0 || (ex.links?.length ?? 0) > 0) && (
            <span className="text-muted" style={{ marginLeft: '0.25rem' }}>
              ({(ex.alternatives?.length ?? 0)} vaihtoehto{(ex.alternatives?.length ?? 0) !== 1 ? 'a' : ''}
              {(ex.links?.length ?? 0) > 0 ? `, ${ex.links!.length} linkki${ex.links!.length !== 1 ? 'ä' : ''}` : ''})
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="alternatives-section">
            {/* Links */}
            <div className="mb-2">
              <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>
                Linkit (esim. YouTube-tutoriaalit)
              </label>
              {(ex.links || []).map((link, idx) => (
                <div key={idx} className="flex gap-sm mb-1" style={{ alignItems: 'center' }}>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm link-truncate">
                    {link}
                  </a>
                  <button className="btn btn-danger btn-sm" onClick={() => onRemoveLink(idx)}>×</button>
                </div>
              ))}
              <div className="flex gap-sm">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://youtube.com/..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onAddLink(linkInput);
                      setLinkInput('');
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { onAddLink(linkInput); setLinkInput(''); }}
                >
                  Lisää
                </button>
              </div>
            </div>

            {/* Alternatives with full parameters */}
            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>
              Vaihtoehtoiset liikkeet
            </label>
            {(ex.alternatives || []).map((alt, altIdx) => (
              <div key={alt.id} className="alt-exercise-card mb-1">
                <div className="exercise-fields-2col">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Nimi</label>
                    <input
                      type="text"
                      value={alt.name}
                      onChange={(e) => onUpdateAlternative(altIdx, { name: e.target.value })}
                      placeholder="esim. Tasapenkki"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Väline</label>
                    <input
                      type="text"
                      value={alt.equipment || ''}
                      onChange={(e) => onUpdateAlternative(altIdx, { equipment: e.target.value })}
                      placeholder="esim. vapaapenkki"
                    />
                  </div>
                </div>
                <div className="exercise-fields-4col mt-1">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Sarjat</label>
                    <input
                      type="number"
                      value={alt.sets ?? ex.sets}
                      min={1}
                      onChange={(e) => onUpdateAlternative(altIdx, { sets: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Toistot</label>
                    <input
                      type="text"
                      value={alt.reps ?? ex.reps}
                      onChange={(e) => onUpdateAlternative(altIdx, { reps: e.target.value })}
                      placeholder="8-12"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Lepo (s)</label>
                    <input
                      type="number"
                      value={alt.restSeconds ?? ex.restSeconds}
                      min={0}
                      step={15}
                      onChange={(e) => onUpdateAlternative(altIdx, { restSeconds: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="mt-1" style={{ textAlign: 'right' }}>
                  <button className="btn btn-danger btn-sm" onClick={() => onRemoveAlternative(altIdx)}>Poista</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={onAddAlternative}>
              + Lisää vaihtoehto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
