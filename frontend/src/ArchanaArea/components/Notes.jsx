import React, { useState, useEffect, useCallback } from 'react';
const API_BASE = import.meta.env.VITE_API_URL;
const ENDPOINT = `${API_BASE}/api/node-matrix/`;

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:          #0d0d0f;
    --surface:     #141416;
    --surface-up:  #1c1c1f;
    --border:      #2a2a2e;
    --border-hov:  #3f3f46;
    --accent:      #10b981;
    --accent-dim:  #0d9268;
    --accent-glow: rgba(16,185,129,0.15);
    --accent-text: #6ee7b7;
    --white:       #f4f4f5;
    --muted:       #71717a;
    --dimmer:      #52525b;
    --danger:      #ef4444;
    --danger-dim:  rgba(239,68,68,0.12);
  }

  body {
    background: var(--bg);
    font-family: 'DM Sans', sans-serif;
    color: var(--white);
    -webkit-font-smoothing: antialiased;
  }

  /* ── PAGE ── */
  .page {
    min-height: 100vh;
    padding: 3.5rem 3rem 6rem;
    max-width: 1320px;
    margin: 0 auto;
  }
  @media (max-width: 768px) { .page { padding: 2rem 1.25rem 4rem; } }

  /* ── HEADER ── */
  .eyebrow-row {
    display: flex; align-items: center; gap: 1rem; margin-bottom: 1.6rem;
  }
  .eyebrow {
    font-family: 'Syne', sans-serif;
    font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 3.5px;
    color: var(--accent);
  }
  .eyebrow-line {
    flex: 1; height: 1px;
    background: linear-gradient(to right, var(--border), transparent);
  }
  .header-row {
    display: flex; justify-content: space-between;
    align-items: flex-start; gap: 2rem; margin-bottom: 3rem;
  }
  @media (max-width: 640px) { .header-row { flex-direction: column; gap: 1.2rem; } }

  .page-title {
    font-family: 'Syne', sans-serif;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800; color: var(--white);
    letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 0.6rem;
  }
  .page-title em { font-style: normal; color: var(--accent); }
  .page-desc {
    font-size: 0.95rem; color: var(--muted);
    line-height: 1.7; max-width: 500px;
  }

  /* ── BUTTONS ── */
  .add-btn {
    font-family: 'Syne', sans-serif;
    font-size: 0.82rem; font-weight: 700; letter-spacing: 0.5px;
    padding: 0.7rem 1.4rem; border-radius: 10px; cursor: pointer;
    transition: all 0.2s ease; white-space: nowrap;
  }
  .add-btn.open {
    border: 1.5px solid var(--border);
    background: var(--surface-up); color: var(--muted);
  }
  .add-btn.closed {
    border: 1.5px solid var(--accent);
    background: var(--accent); color: #000;
  }
  .add-btn:hover { transform: translateY(-1px); }
  .add-btn.open:hover  { background: var(--border); border-color: var(--border-hov); color: var(--white); }
  .add-btn.closed:hover { background: var(--accent-dim); border-color: var(--accent-dim); }
  .add-btn:active { transform: translateY(0); }

  .btn {
    font-family: 'Syne', sans-serif;
    font-size: 0.78rem; font-weight: 700;
    padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;
    transition: all 0.18s ease;
  }
  .btn.primary {
    border: 1.5px solid var(--accent);
    background: var(--accent); color: #000;
  }
  .btn.primary:hover  { background: var(--accent-dim); border-color: var(--accent-dim); }
  .btn.secondary {
    border: 1.5px solid var(--border);
    background: transparent; color: var(--muted);
  }
  .btn.secondary:hover { background: var(--surface-up); border-color: var(--border-hov); color: var(--white); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .icon-btn {
    width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; transition: all 0.15s ease; flex-shrink: 0;
  }
  .icon-btn.edit {
    border: 1.5px solid var(--border);
    background: var(--surface-up); color: var(--dimmer);
  }
  .icon-btn.edit:hover  { background: var(--border-hov); border-color: var(--border-hov); color: var(--white); transform: scale(1.08); }
  .icon-btn.danger {
    border: 1.5px solid rgba(239,68,68,0.3);
    background: var(--danger-dim); color: var(--danger);
  }
  .icon-btn.danger:hover { background: var(--danger); border-color: var(--danger); color: var(--white); transform: scale(1.08); }
  .icon-btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

  /* ── FORM PANEL ── */
  .form-panel {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-top: 2px solid var(--accent);
    border-radius: 16px; padding: 1.75rem;
    margin-bottom: 2.5rem;
    animation: slideIn 0.28s ease;
  }
  .form-panel-title {
    font-family: 'Syne', sans-serif;
    font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 2.5px;
    color: var(--accent); margin-bottom: 1.25rem;
  }
  .form-row {
    display: flex; gap: 0.85rem;
    align-items: flex-end; flex-wrap: wrap;
  }
  .field { display: flex; flex-direction: column; gap: 0.4rem; }
  .field.f1 { flex: 0 0 80px; min-width: 80px; }
  .field.f2 { flex: 1; min-width: 160px; }
  .field.f3 { flex: 2; min-width: 200px; }

  .lbl {
    font-family: 'Syne', sans-serif;
    font-size: 0.65rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--dimmer);
  }
  .inp {
    background: var(--surface-up);
    border: 1.5px solid var(--border);
    border-radius: 9px; padding: 0.58rem 0.85rem;
    font-size: 0.88rem; font-family: 'DM Sans', sans-serif;
    color: var(--white); transition: border-color 0.2s, box-shadow 0.2s;
    width: 100%;
  }
  .inp::placeholder { color: var(--dimmer); }
  .inp:focus {
    outline: none; border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  .inp.sm { padding: 0.42rem 0.65rem; font-size: 0.82rem; margin-bottom: 0.45rem; }

  .form-actions { display: flex; gap: 0.5rem; margin-top: 1.2rem; }

  .error-banner {
    margin-top: 0.75rem; padding: 0.6rem 0.9rem;
    background: var(--danger-dim);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 8px; font-size: 0.82rem; color: var(--danger);
  }
  .error-banner.inline { margin-top: 0; margin-bottom: 0.5rem; padding: 0.45rem 0.7rem; }
  .error-banner.top    { margin-bottom: 2rem; margin-top: 0; }
  .error-retry { text-decoration: underline; cursor: pointer; }

  /* ── GRID ── */
  .note-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
    gap: 1.25rem;
  }

  /* ── CARD ── */
  .note-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 18px; padding: 1.65rem;
    position: relative; display: flex; flex-direction: column;
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    animation: fadeUp 0.4s ease both;
  }
  .note-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.2);
    border-color: rgba(16,185,129,0.4);
  }

  /* FIX: card-actions always visible on mobile; fade in on desktop hover */
  .card-actions {
    position: absolute; top: 1.1rem; right: 1.1rem;
    display: flex; gap: 0.35rem;
    opacity: 0; transition: opacity 0.2s ease;
    pointer-events: none;
  }
  .note-card:hover .card-actions {
    opacity: 1;
    pointer-events: all;
  }
  @media (max-width: 768px) {
    .card-actions { opacity: 1; pointer-events: all; }
  }

  .note-em    { font-size: 1.6rem; line-height: 1; margin-bottom: 0.65rem; }
  .note-title {
    font-family: 'Syne', sans-serif;
    font-size: 0.96rem; font-weight: 800; color: var(--white);
    margin-bottom: 0.35rem; letter-spacing: -0.01em; padding-right: 3rem;
  }
  .note-text  { font-size: 0.875rem; color: var(--muted); line-height: 1.68; }
  .note-date  {
    font-size: 0.72rem; color: var(--dimmer); margin-top: 1rem;
    font-family: 'Syne', sans-serif; letter-spacing: 0.5px;
  }

  /* ── INLINE EDIT ── */
  .inline-edit    { animation: slideIn 0.2s ease; width: 100%; }
  .inline-row     { display: flex; gap: 0.4rem; }
  .inline-actions { display: flex; gap: 0.4rem; }
  .inline-actions .btn { font-size: 0.74rem; padding: 0.4rem 0.8rem; }

  /* ── SKELETON ── */
  .skeleton {
    background: linear-gradient(
      90deg, var(--surface) 25%, var(--surface-up) 50%, var(--surface) 75%
    );
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite linear;
    border: 1.5px solid var(--border);
    border-radius: 18px; height: 155px;
  }

  /* ── EMPTY ── */
  .empty-state {
    grid-column: 1 / -1; text-align: center;
    padding: 4.5rem 2rem; color: var(--dimmer);
  }
  .empty-em    { font-size: 2.4rem; margin-bottom: 0.9rem; }
  .empty-title {
    font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700;
    color: var(--muted); margin-bottom: 0.35rem;
  }
  .empty-desc  { font-size: 0.84rem; }

  /* ── SPINNER ── */
  .spin {
    display: inline-block; width: 13px; height: 13px;
    border: 2px solid transparent; border-top-color: currentColor;
    border-radius: 50%; animation: spin 0.7s linear infinite;
    margin-right: 5px; vertical-align: middle;
  }

  /* ── TOAST ── */
  .toast-wrap {
    position: fixed; bottom: 2rem; right: 2rem;
    z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem;
  }
  .toast {
    border-radius: 10px; padding: 0.7rem 1.1rem;
    font-size: 0.83rem; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    animation: toastIn 0.25s ease; display: flex;
    align-items: center; gap: 0.5rem; max-width: 300px;
  }
  .toast.ok  { background: #0f1f17; border: 1.5px solid rgba(16,185,129,0.35); color: var(--accent-text); }
  .toast.err { background: #1f1010; border: 1.5px solid rgba(239,68,68,0.35); color: #fca5a5; }

  /* ── KEYFRAMES ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const EMPTY = { emoji: '', title: '', text: '' };

const parseError = async (res) => {
  try {
    const data = await res.json();
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(' · ');
    }
    return String(data);
  } catch {
    return `Server error (${res.status})`;
  }
};

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

export default function Notes() {
  const [notes,      setNotes]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newForm,    setNewForm]    = useState(EMPTY);
  const [createErr,  setCreateErr]  = useState(null);
  const [creating,   setCreating]   = useState(false);

  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState(EMPTY);
  const [editErr,    setEditErr]    = useState(null);
  const [saving,     setSaving]     = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [toasts,     setToasts]     = useState([]);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, err }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);


  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setNotes(await res.json());
    } catch (e) {
      console.error('[Notes] fetch error:', e);
      setFetchErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);


  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newForm.title.trim() || !newForm.text.trim()) {
      setCreateErr('Title and thought text are required.');
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emoji: newForm.emoji || '📝',
          title: newForm.title.trim(),
          text:  newForm.text.trim(),
        }),
      });
      if (!res.ok) { setCreateErr(await parseError(res)); return; }
      const created = await res.json();
      setNotes(prev => [created, ...prev]);
      setNewForm(EMPTY);
      setIsCreating(false);
      toast('Note saved ✓');
    } catch (e) {
      console.error('[Notes] create error:', e);
      setCreateErr('Network error — check that Django is running and /api/node-matrix/ is reachable.');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (note) => {
    setEditId(note.id);
    setEditForm({ emoji: note.emoji, title: note.title, text: note.text });
    setEditErr(null);
  };


  const handleUpdate = async (e, id) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.text.trim()) {
      setEditErr('Title and thought text are required.');
      return;
    }
    setSaving(true);
    setEditErr(null);
    try {
      const res = await fetch(`${ENDPOINT}${id}/`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emoji: editForm.emoji || '📝',
          title: editForm.title.trim(),
          text:  editForm.text.trim(),
        }),
      });
      if (!res.ok) { setEditErr(await parseError(res)); return; }
      const updated = await res.json();
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
      setEditId(null);
      toast('Note updated ✓');
    } catch (e) {
      console.error('[Notes] update error:', e);
      setEditErr('Network error — check that Django is running.');
    } finally {
      setSaving(false);
    }
  };

  
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${ENDPOINT}${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) { toast('Delete failed.', true); return; }
      setNotes(prev => prev.filter(n => n.id !== id));
      toast('Note deleted');
    } catch (e) {
      console.error('[Notes] delete error:', e);
      toast('Network error.', true);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <style>{style}</style>

      <div className="page">

        <div className="eyebrow-row">
          <span className="eyebrow">Notes</span>
          <div className="eyebrow-line" />
        </div>

        <div className="header-row">
          <div>
            <h1 className="page-title">Private <em>Thoughts</em></h1>
            <p className="page-desc">
              Things I write to myself. Reminders. Intentions.
              The stuff that doesn't go in the commit message.
            </p>
          </div>
          <button
            className={`add-btn ${isCreating ? 'open' : 'closed'}`}
            onClick={() => {
              setIsCreating(v => !v);
              setCreateErr(null);
              setNewForm(EMPTY);
            }}
          >
            {isCreating ? '✕ Close' : '+ Add Note'}
          </button>
        </div>

        {isCreating && (
          <div className="form-panel">
            <div className="form-panel-title">New Note Entry</div>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="field f1">
                  <label className="lbl">Emoji</label>
                  <input
                    className="inp"
                    type="text"
                    placeholder="💡"
                    maxLength={10}
                    value={newForm.emoji}
                    onChange={e => setNewForm({ ...newForm, emoji: e.target.value })}
                  />
                </div>
                <div className="field f2">
                  <label className="lbl">Title *</label>
                  <input
                    className="inp"
                    type="text"
                    placeholder="Note subject"
                    value={newForm.title}
                    onChange={e => setNewForm({ ...newForm, title: e.target.value })}
                  />
                </div>
                <div className="field f3">
                  <label className="lbl">Internal Thought *</label>
                  <input
                    className="inp"
                    type="text"
                    placeholder="What are you thinking about?"
                    value={newForm.text}
                    onChange={e => setNewForm({ ...newForm, text: e.target.value })}
                  />
                </div>
              </div>

              {createErr && (
                <div className="error-banner">⚠ {createErr}</div>
              )}

              <div className="form-actions">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={creating}
                >
                  {creating && <span className="spin" />}
                  {creating ? 'Saving…' : 'Save Note'}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setCreateErr(null);
                    setNewForm(EMPTY);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {fetchErr && (
          <div className="error-banner top">
            ⚠ Could not load notes — {fetchErr}.{' '}
            <span className="error-retry" onClick={fetchNotes}>Retry</span>
          </div>
        )}

        <div className="note-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" />
              ))
            : notes.length === 0
              ? (
                <div className="empty-state">
                  <div className="empty-em">📭</div>
                  <div className="empty-title">No notes yet</div>
                  <div className="empty-desc">Start writing your thoughts above.</div>
                </div>
              )
              : notes.map((n, i) => (
                  <div
                    key={n.id}
                    className="note-card"
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    {editId === n.id ? (

                      <div className="inline-edit">
                        <form onSubmit={e => handleUpdate(e, n.id)}>
                          <div className="inline-row">
                            <input
                              className="inp sm"
                              style={{ width: '58px', flex: '0 0 58px' }}
                              value={editForm.emoji}
                              maxLength={10}
                              placeholder="📝"
                              onChange={e => setEditForm({ ...editForm, emoji: e.target.value })}
                            />
                            <input
                              className="inp sm"
                              style={{ flex: 1 }}
                              value={editForm.title}
                              placeholder="Title"
                              required
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            />
                          </div>
                          <input
                            className="inp sm"
                            style={{ width: '100%' }}
                            value={editForm.text}
                            placeholder="Thought text"
                            required
                            onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                          />
                          {editErr && (
                            <div className="error-banner inline">⚠ {editErr}</div>
                          )}
                          <div className="inline-actions">
                            <button
                              className="btn primary"
                              type="submit"
                              disabled={saving}
                            >
                              {saving && <span className="spin" />}
                              {saving ? 'Saving…' : 'Update'}
                            </button>
                            <button
                              className="btn secondary"
                              type="button"
                              onClick={() => { setEditId(null); setEditErr(null); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>

                    ) : (

                      <>
                        <div className="card-actions">
                          <button
                            className="icon-btn edit"
                            title="Edit"
                            onClick={() => startEdit(n)}
                          >
                            ✏
                          </button>
                          <button
                            className="icon-btn danger"
                            title="Delete"
                            disabled={deletingId === n.id}
                            onClick={() => handleDelete(n.id)}
                          >
                            {deletingId === n.id
                              ? <span className="spin" />
                              : '✕'}
                          </button>
                        </div>
                        <div className="note-em">{n.emoji || '📝'}</div>
                        <div className="note-title">{n.title}</div>
                        <div className="note-text">{n.text}</div>
                        {n.created_at && (
                          <div className="note-date">{fmtDate(n.created_at)}</div>
                        )}
                      </>

                    )}
                  </div>
                ))
          }
        </div>
      </div>

      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.err ? 'err' : 'ok'}`}>
            {t.err ? '✗' : '✓'} {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}