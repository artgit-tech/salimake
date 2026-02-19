import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useData } from '../contexts/DataContext';
import type { ExerciseTemplate, AlternativeExercise } from '../types';

const CATEGORIES = ['Rinta', 'Selkä', 'Olkapää', 'Kädet', 'Jalat', 'Vatsa', 'Muu'];

function createTemplate(): ExerciseTemplate {
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
    category: '',
  };
}

export default function ExerciseTemplates() {
  const { exerciseTemplates, saveExerciseTemplate, deleteExerciseTemplate, loading } = useData();
  const [editing, setEditing] = useState<ExerciseTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [newLink, setNewLink] = useState('');

  if (loading) return <div className="loading-spinner" />;

  const filteredTemplates = filterCategory
    ? exerciseTemplates.filter((t) => t.category === filterCategory)
    : exerciseTemplates;

  const sorted = [...filteredTemplates].sort((a, b) => {
    if (a.category && b.category && a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  const handleSave = async () => {
    if (!editing || !editing.name.trim()) {
      alert('Anna liikkeelle nimi');
      return;
    }
    await saveExerciseTemplate(editing);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Poista liiketemplate?')) return;
    await deleteExerciseTemplate(id);
  };

  const addAlternative = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      alternatives: [
        ...(editing.alternatives || []),
        { id: uuid(), name: '', equipment: '', sets: editing.sets, reps: editing.reps, restSeconds: editing.restSeconds },
      ],
    });
  };

  const updateAlternative = (idx: number, partial: Partial<AlternativeExercise>) => {
    if (!editing) return;
    const alts = [...(editing.alternatives || [])];
    alts[idx] = { ...alts[idx], ...partial };
    setEditing({ ...editing, alternatives: alts });
  };

  const removeAlternative = (idx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      alternatives: (editing.alternatives || []).filter((_, i) => i !== idx),
    });
  };

  const addLink = () => {
    if (!editing || !newLink.trim()) return;
    setEditing({ ...editing, links: [...(editing.links || []), newLink.trim()] });
    setNewLink('');
  };

  const removeLink = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, links: (editing.links || []).filter((_, i) => i !== idx) });
  };

  // --- Edit modal ---
  if (editing) {
    return (
      <div>
        <h1 className="page-title">{editing.name ? 'Muokkaa liikettä' : 'Uusi liiketemplate'}</h1>

        <div className="card">
          <div className="exercise-fields-2col">
            <div className="form-group">
              <label>Liikkeen nimi</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="esim. Penkkipunnerrus"
              />
            </div>
            <div className="form-group">
              <label>Kategoria</label>
              <select
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                <option value="">Ei kategoriaa</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Väline / suoritustapa</label>
            <input
              type="text"
              value={editing.equipment || ''}
              onChange={(e) => setEditing({ ...editing, equipment: e.target.value })}
              placeholder="esim. rintaprässi"
            />
          </div>

          <div className="exercise-fields-4col">
            <div className="form-group">
              <label>Sarjat</label>
              <input
                type="number"
                value={editing.sets}
                min={1}
                onChange={(e) => setEditing({ ...editing, sets: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="form-group">
              <label>Toistot</label>
              <input
                type="text"
                value={editing.reps}
                onChange={(e) => setEditing({ ...editing, reps: e.target.value })}
                placeholder="8-12"
              />
            </div>
            <div className="form-group">
              <label>Lepo (s)</label>
              <input
                type="number"
                value={editing.restSeconds}
                min={0}
                step={15}
                onChange={(e) => setEditing({ ...editing, restSeconds: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Muistiinpano</label>
            <input
              type="text"
              value={editing.notes || ''}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              placeholder="esim. leveä ote, kyynärpäät sivuille..."
            />
          </div>
        </div>

        {/* Links */}
        <div className="card">
          <h3>Linkit</h3>
          {(editing.links || []).map((link, idx) => (
            <div key={idx} className="flex gap-sm mb-1" style={{ alignItems: 'center' }}>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm"
                style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {link}
              </a>
              <button className="btn btn-danger btn-sm" onClick={() => removeLink(idx)}>×</button>
            </div>
          ))}
          <div className="flex gap-sm">
            <input
              type="text"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://youtube.com/..."
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={addLink}>Lisää</button>
          </div>
        </div>

        {/* Alternatives */}
        <div className="card">
          <h3>Vaihtoehtoiset liikkeet</h3>
          {(editing.alternatives || []).map((alt, idx) => (
            <div key={alt.id} className="alternative-row-full mb-1">
              <div className="exercise-fields-2col">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Nimi</label>
                  <input
                    type="text"
                    value={alt.name}
                    onChange={(e) => updateAlternative(idx, { name: e.target.value })}
                    placeholder="esim. Vinopenkki"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Väline</label>
                  <input
                    type="text"
                    value={alt.equipment || ''}
                    onChange={(e) => updateAlternative(idx, { equipment: e.target.value })}
                    placeholder="esim. vapaapenkki"
                  />
                </div>
              </div>
              <div className="exercise-fields-4col mt-1">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Sarjat</label>
                  <input
                    type="number"
                    value={alt.sets ?? editing.sets}
                    min={1}
                    onChange={(e) => updateAlternative(idx, { sets: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Toistot</label>
                  <input
                    type="text"
                    value={alt.reps ?? editing.reps}
                    onChange={(e) => updateAlternative(idx, { reps: e.target.value })}
                    placeholder="8-12"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Lepo (s)</label>
                  <input
                    type="number"
                    value={alt.restSeconds ?? editing.restSeconds}
                    min={0}
                    step={15}
                    onChange={(e) => updateAlternative(idx, { restSeconds: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="mt-1" style={{ textAlign: 'right' }}>
                <button className="btn btn-danger btn-sm" onClick={() => removeAlternative(idx)}>Poista</button>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addAlternative}>
            + Lisää vaihtoehto
          </button>
        </div>

        <div className="flex gap-sm">
          <button className="btn btn-primary" onClick={handleSave}>Tallenna</button>
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>Peruuta</button>
        </div>
      </div>
    );
  }

  // --- List view ---
  return (
    <div>
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Liikekirjasto</h1>
        <button className="btn btn-primary" onClick={() => setEditing(createTemplate())}>
          + Uusi liike
        </button>
      </div>

      {CATEGORIES.length > 0 && (
        <div className="mb-2">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Kaikki kategoriat</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>Ei vielä liiketemplateita. Luo ensimmäinen!</p>
          <p className="text-sm text-muted">
            Liiketemplate on pohja, jonka voit nopeasti lisätä ohjelmaan.
          </p>
        </div>
      ) : (
        sorted.map((t) => (
          <div key={t.id} className="card">
            <div className="flex-between">
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>{t.name}</h3>
                <span className="text-muted text-sm">
                  {t.equipment && `${t.equipment} · `}
                  {t.sets}×{t.reps} · lepo {t.restSeconds}s
                  {t.category && ` · ${t.category}`}
                  {(t.alternatives?.length ?? 0) > 0 && ` · ${t.alternatives!.length} vaihtoehto${t.alternatives!.length > 1 ? 'a' : ''}`}
                </span>
              </div>
              <div className="flex gap-sm">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...t })}>
                  Muokkaa
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                  Poista
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
