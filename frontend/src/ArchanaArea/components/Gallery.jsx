import React, { useState, useRef, useEffect, useCallback } from 'react';
const API_BASE = import.meta.env.VITE_API_URL;

const ENDPOINT = `${API_BASE}/api/archive/`;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --dark:       #0f172a;
    --soft:       #747c8c;
    --border:     #d4cec3;
    --accent:     #e6e1d6;
    --green:      #10b981;
    --green-dim:  #0d9268;
    --danger:     #e53e3e;
    --white:      #ffffff;
    --paper:      #fcfaf8;
    --bg:         #f6f3ee;
  }

  body {
    background-color: var(--bg);
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── PAGE ── */
  .arc-page {
    max-width: 1300px;
    margin: 0 auto;
    padding: 5rem 2rem 10rem;
    animation: arcFadeUp 0.5s ease forwards;
  }

  /* ── HEADER ── */
  .arc-hero { margin-bottom: 6rem; text-align: center; }

  .arc-label {
    font-family: 'Syne', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 5px;
    color: var(--soft);
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }
  .arc-label::before, .arc-label::after {
    content: '';
    flex: 0 1 50px;
    height: 1px;
    background: var(--border);
  }

  .arc-title {
    font-family: 'Syne', sans-serif;
    font-size: clamp(2.5rem, 6vw, 4.2rem);
    font-weight: 800;
    color: var(--dark);
    letter-spacing: -0.05em;
    margin-bottom: 1rem;
  }
  .arc-title em {
    font-style: normal;
    color: var(--green);
    position: relative;
  }
  .arc-title em::after {
    content: '';
    position: absolute;
    bottom: 5px; left: 0; right: 0;
    height: 10px;
    background: var(--green);
    opacity: 0.1;
  }

  .arc-desc {
    font-size: 1.05rem;
    color: var(--soft);
    max-width: 580px;
    margin: 0 auto 3rem;
    line-height: 1.9;
  }

  .arc-action-bar { display: flex; justify-content: center; }

  .arc-capture-btn {
    font-family: 'Syne', sans-serif;
    font-size: 1rem;
    font-weight: 800;
    color: var(--white);
    background: var(--dark);
    border: none;
    padding: 1.1rem 2.2rem;
    border-radius: 50px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.18);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .arc-capture-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(15, 23, 42, 0.25);
  }
  .arc-capture-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .arc-capture-plus { font-size: 1.3rem; font-weight: 300; }

  /* ── MASONRY ── */
  .arc-masonry { column-count: 3; column-gap: 2.2rem; padding: 1rem; }
  @media (max-width: 1024px) { .arc-masonry { column-count: 2; } }
  @media (max-width: 580px)  { .arc-masonry { column-count: 1; } }

  /* ── SKELETON ── */
  .arc-skeleton {
    break-inside: avoid;
    display: inline-block;
    width: 100%;
    margin-bottom: 2.2rem;
    border-radius: 4px;
    background: linear-gradient(90deg, #ede9e2 25%, #f5f2ec 50%, #ede9e2 75%);
    background-size: 600px 100%;
    animation: arcShimmer 1.5s infinite linear;
  }

  /* ── CARD ── */
  .arc-card-wrap {
    break-inside: avoid;
    display: inline-block;
    width: 100%;
    margin-bottom: 2.2rem;
    transition: transform 0.3s ease;
    position: relative;
    z-index: 1;
  }
  .arc-card-wrap:hover { z-index: 10; }

  .arc-polaroid {
    background: var(--paper);
    padding: 1.2rem 1.2rem 1.6rem;
    border-radius: 2px;
    border: 1px solid var(--border);
    position: relative;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    transition: box-shadow 0.3s ease;
  }
  .arc-card-wrap:hover .arc-polaroid { box-shadow: 0 16px 44px rgba(0,0,0,0.12); }

  .arc-tape {
    position: absolute;
    width: 58px; height: 18px;
    background: rgba(191,176,142,0.18);
    z-index: 11;
  }
  .arc-tape.left  { top: -5px; left: 12px;  transform: rotate(-14deg); }
  .arc-tape.right { top: -5px; right: 12px; transform: rotate(14deg); }

  .arc-img-box {
    position: relative;
    overflow: hidden;
    border-radius: 1px;
    background: var(--accent);
    margin-bottom: 1.1rem;
    min-height: 120px;
  }
  .arc-img-box img {
    width: 100%;
    display: block;
    object-fit: cover;
    transition: transform 1.5s ease;
  }
  .arc-card-wrap:hover .arc-img-box img { transform: scale(1.08); }

  /* FIX: pointer-events so overlay buttons are always clickable */
  .arc-hover-overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .arc-card-wrap:hover .arc-hover-overlay {
    opacity: 1;
    pointer-events: all;
  }

  .arc-ov-btn {
    font-family: 'Syne', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 0.55rem 1.1rem;
    border-radius: 50px;
    border: none;
    background: var(--white);
    cursor: pointer;
    transition: transform 0.18s ease;
  }
  .arc-ov-btn:hover { transform: scale(1.08); }
  .arc-ov-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .arc-ov-btn.edit   { color: var(--dark); }
  .arc-ov-btn.danger { color: var(--danger); }

  .arc-card-stamp { font-family: monospace; font-size: 0.68rem; color: #b0a898; margin-bottom: 0.22rem; }
  .arc-card-title { font-family: 'Syne', sans-serif; font-size: 0.96rem; font-weight: 700; color: var(--dark); line-height: 1.35; }

  /* ── EMPTY ── */
  .arc-empty {
    text-align: center;
    padding: 8rem 2rem;
    background: var(--paper);
    border-radius: 8px;
    border: 1px solid var(--border);
    cursor: pointer;
  }
  .arc-empty h3 { font-family: 'Syne', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--soft); margin-bottom: 0.5rem; }
  .arc-empty p  { font-size: 1rem; color: var(--soft); opacity: 0.7; }
  .arc-empty:hover h3 { color: var(--green); }

  /* ── ERROR BANNER ── */
  .arc-err-banner {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 8px;
    padding: 1rem 1.4rem;
    color: var(--danger);
    font-size: 0.88rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .arc-err-banner span { text-decoration: underline; cursor: pointer; }

  /* ── OVERLAY ── */
  .arc-overlay {
    position: fixed; inset: 0;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    z-index: 1000;
    animation: arcOverlayIn 0.3s ease;
  }

  /* ── MODAL ── */
  .arc-modal {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 90%; max-width: 490px;
    max-height: 90vh; overflow-y: auto;
    background: var(--white);
    border-radius: 14px;
    padding: 3rem;
    box-shadow: 0 24px 64px rgba(0,0,0,0.22);
    z-index: 1001;
    animation: arcModalIn 0.35s ease forwards;
  }
  .arc-modal-close {
    position: absolute; top: 1.4rem; right: 1.8rem;
    background: none; border: none;
    font-size: 1.8rem; color: var(--soft);
    cursor: pointer; line-height: 1;
  }
  .arc-modal-close:hover { color: var(--danger); }
  .arc-modal-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.5rem; font-weight: 800;
    color: var(--dark); letter-spacing: -0.04em;
    margin-bottom: 2.5rem; text-align: center;
  }

  .arc-form { display: flex; flex-direction: column; gap: 1.8rem; }
  .arc-fgroup { display: flex; flex-direction: column; gap: 0.55rem; }
  .arc-flabel { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--soft); }

  .arc-finput {
    padding: 0.9rem 1.2rem;
    font-size: 0.92rem;
    font-family: 'DM Sans', sans-serif;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--paper);
    color: var(--dark);
    transition: border-color 0.2s, box-shadow 0.2s;
    width: 100%;
  }
  .arc-finput::placeholder { color: #b0a898; }
  .arc-finput:focus {
    outline: none;
    border-color: var(--dark);
    box-shadow: 0 0 0 3px rgba(15,23,42,0.06);
  }

  /* source toggle */
  .arc-source-toggle { display: flex; gap: 0.6rem; }
  .arc-source-btn {
    font-family: 'Syne', sans-serif;
    font-size: 0.75rem; font-weight: 700;
    padding: 0.5rem 1rem; border-radius: 6px;
    cursor: pointer; transition: all 0.18s ease;
  }
  .arc-source-btn.active  { border: 1.5px solid var(--dark); background: var(--dark); color: var(--white); }
  .arc-source-btn.inactive { border: 1.5px solid var(--border); background: transparent; color: var(--soft); }
  .arc-source-btn.inactive:hover { border-color: var(--dark); color: var(--dark); }

  /* upload zone */
  .arc-upload-zone { display: flex; align-items: center; gap: 1rem; }
  .arc-upload-btn {
    font-size: 0.85rem; font-weight: 600;
    color: var(--dark); padding: 0.75rem 1.3rem;
    border-radius: 6px; border: 1px solid var(--border);
    background: var(--white); cursor: pointer;
    transition: background 0.18s;
  }
  .arc-upload-btn:hover { background: var(--accent); }
  .arc-upload-status       { font-size: 0.8rem; font-weight: 600; color: var(--green); }
  .arc-upload-status.muted { color: var(--soft); }

  /* preview */
  .arc-preview img {
    width: 100%; max-height: 130px;
    object-fit: contain; border-radius: 5px;
    border: 1px solid var(--border); background: #f0ece6;
  }

  /* modal error */
  .arc-modal-err {
    padding: 0.6rem 0.9rem;
    background: #fff5f5; border: 1px solid #fed7d7;
    border-radius: 6px; font-size: 0.82rem; color: var(--danger);
  }

  /* modal actions */
  .arc-modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 0.5rem; }
  .arc-mbtn {
    font-size: 0.9rem; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    padding: 0.85rem 1.6rem; border-radius: 6px;
    cursor: pointer; transition: opacity 0.18s, transform 0.1s;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .arc-mbtn:active { transform: translateY(1px); }
  .arc-mbtn:disabled { opacity: 0.5; cursor: not-allowed; }
  .arc-mbtn.cancel { background: none; border: 1px solid var(--border); color: var(--soft); }
  .arc-mbtn.cancel:hover { background: var(--accent); color: var(--dark); }
  .arc-mbtn.submit-create { border: none; background: var(--green); color: var(--white); }
  .arc-mbtn.submit-edit   { border: none; background: var(--dark);  color: var(--white); }
  .arc-mbtn.submit-create:hover:not(:disabled),
  .arc-mbtn.submit-edit:hover:not(:disabled) { opacity: 0.88; }

  /* ── SPINNER ── */
  .arc-spin {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid transparent; border-top-color: currentColor;
    border-radius: 50%; animation: arcSpin 0.7s linear infinite;
    flex-shrink: 0;
  }

  /* ── TOAST ── */
  .arc-toast-wrap {
    position: fixed; bottom: 2rem; right: 2rem;
    z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem;
  }
  .arc-toast {
    padding: 0.7rem 1.1rem; border-radius: 10px;
    font-size: 0.83rem; font-weight: 500;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
    animation: arcToastIn 0.25s ease;
    display: flex; align-items: center; gap: 0.5rem; max-width: 280px;
  }
  .arc-toast.ok  { background: #f0fdf9; border: 1.5px solid #a7f3d0; color: #065f46; }
  .arc-toast.err { background: #fff5f5; border: 1.5px solid #fecaca; color: var(--danger); }

  /* ── KEYFRAMES ── */
  @keyframes arcFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes arcModalIn {
    from { opacity: 0; transform: translate(-50%, -46%) scale(0.95); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes arcOverlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes arcSpin { to { transform: rotate(360deg); } }
  @keyframes arcShimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes arcToastIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const parseErr = async (res) => {
  try {
    const d = await res.json();
    if (typeof d === 'object')
      return Object.entries(d)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(' · ');
    return String(d);
  } catch {
    return `Server error (${res.status})`;
  }
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });


function MemoryCard({ stamp, onEdit, onDelete, deleting }) {
  const tilt    = React.useMemo(() => (((stamp.id * 7919) % 100) / 100 - 0.5) * 6, [stamp.id]);
  const tapePos = stamp.id % 2 === 0 ? 'left' : 'right';

  return (
    <div
      className="arc-card-wrap"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <article className="arc-polaroid">
        <div className={`arc-tape ${tapePos}`} />
        <div className="arc-img-box">
          {stamp.image_url ? (
            <img src={stamp.image_url} alt={stamp.title} loading="lazy" />
          ) : (
           
            <div style={{
              height: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b0a898',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
            }}>
              no image
            </div>
          )}
          <div className="arc-hover-overlay">
            <button className="arc-ov-btn edit" onClick={() => onEdit(stamp)}>
              Edit
            </button>
            <button
              className="arc-ov-btn danger"
              disabled={deleting}
              onClick={() => onDelete(stamp.id)}
            >
              {deleting ? <span className="arc-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
        <footer>
          <p className="arc-card-stamp">#{stamp.id} · {fmtDate(stamp.timestamp)}</p>
          <p className="arc-card-title">{stamp.title}</p>
        </footer>
      </article>
    </div>
  );
}

const EMPTY_FORM = {
  title:      '',
  remoteUrl:  '',
  source:     'remote',
  file:       null,
  previewUrl: '',
};

export default function PersonalArchivePage() {
  const [stamps,     setStamps]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formErr,    setFormErr]    = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [toasts,     setToasts]     = useState([]);

  const fileRef = useRef(null);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, err }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);


  const fetchStamps = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setStamps(await res.json());
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStamps(); }, [fetchStamps]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr(null);
    setModal(true);
  };

  const openEdit = (stamp) => {
    setEditing(stamp);
    setForm({
      title:      stamp.title,
      remoteUrl:  stamp.remote_url || '',
      source:     stamp.source     || 'remote',
      file:       null,
      previewUrl: stamp.image_url  || '',
    });
    setFormErr(null);
    setModal(true);
  };

  const closeModal = useCallback(() => {
    if (form.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(form.previewUrl);
    setModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [form.previewUrl]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (form.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(form.previewUrl);
    const preview = URL.createObjectURL(file);
    setForm(f => ({ ...f, file, source: 'local', previewUrl: preview, remoteUrl: '' }));
  };

  const switchSource = (src) => {
    if (form.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(form.previewUrl);
    setForm(f => ({
      ...f,
      source:     src,
      file:       null,
      previewUrl: '',
      remoteUrl:  '',
    }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemoteUrl = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, remoteUrl: val, previewUrl: val }));
  };


  const handleCreate = async () => {
    if (!form.title.trim())                                { setFormErr('Title is required.'); return; }
    if (form.source === 'local'  && !form.file)            { setFormErr('Please select an image file.'); return; }
    if (form.source === 'remote' && !form.remoteUrl.trim()){ setFormErr('Please enter a remote image URL.'); return; }

    setSubmitting(true);
    setFormErr(null);
    try {
      let res;

      if (form.source === 'local') {
        const fd = new FormData();
        fd.append('title',  form.title.trim());
        fd.append('source', 'local');
        fd.append('image',  form.file);          
        res = await fetch(ENDPOINT, { method: 'POST', body: fd });
      } else {
        res = await fetch(ENDPOINT, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:  form.title.trim(),
            source: 'remote',
            url:    form.remoteUrl.trim(),       
          }),
        });
      }

      if (!res.ok) { setFormErr(await parseErr(res)); return; }
      const created = await res.json();
      setStamps(prev => [created, ...prev]);
      closeModal();
      toast('Memory archived ✓');
    } catch (e) {
      console.error('[Archive] create error:', e);
      setFormErr('Network error — check that Django is running and /api/archive/ is reachable.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.title.trim()) { setFormErr('Title is required.'); return; }

    setSubmitting(true);
    setFormErr(null);
    try {
      const url = `${ENDPOINT}${editing.id}/`;
      let res;

      if (form.source === 'local' && form.file) {
        const fd = new FormData();
        fd.append('title',  form.title.trim());
        fd.append('source', 'local');
        fd.append('image',  form.file);
        res = await fetch(url, { method: 'PATCH', body: fd });

      } else if (form.source === 'remote' && form.remoteUrl !== editing.remote_url) {
        res = await fetch(url, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:  form.title.trim(),
            source: 'remote',
            url:    form.remoteUrl.trim(),
          }),
        });

      } else {
        res = await fetch(url, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: form.title.trim() }),
        });
      }

      if (!res.ok) { setFormErr(await parseErr(res)); return; }
      const updated = await res.json();
      setStamps(prev => prev.map(s => s.id === editing.id ? updated : s));
      closeModal();
      toast('Memory updated ✓');
    } catch (e) {
      console.error('[Archive] update error:', e);
      setFormErr('Network error — check that Django is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${ENDPOINT}${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) { toast('Delete failed.', true); return; }
      setStamps(prev => prev.filter(s => s.id !== id));
      toast('Memory removed');
    } catch (e) {
      console.error('[Archive] delete error:', e);
      toast('Network error.', true);
    } finally {
      setDeletingId(null);
    }
  };

  const submitBtnClass = editing ? 'submit-edit' : 'submit-create';

  return (
    <>
      <style>{styles}</style>

      <div className="arc-page">

        <header className="arc-hero">
          <h2 className="arc-label">Personal Archive</h2>
          <h1 className="arc-title">Visual <em>Scrapbook</em></h1>
          <p className="arc-desc">
            A curated collection of fleeting moments and digital artifacts.
            Scroll through the loose grid to relive captured memories.
          </p>
          <div className="arc-action-bar">
            <button
              className="arc-capture-btn"
              onClick={openCreate}
              disabled={loading}
            >
              <span className="arc-capture-plus">+</span>
              Log New Memory Stamp
            </button>
          </div>
        </header>

        {fetchError && (
          <div className="arc-err-banner">
            ⚠ Could not load archive — {fetchError}.{' '}
            <span onClick={fetchStamps}>Retry</span>
          </div>
        )}

        {loading ? (
          <div className="arc-masonry">
            {[220, 280, 190, 260, 310, 200].map((h, i) => (
              <div key={i} className="arc-skeleton" style={{ height: `${h}px` }} />
            ))}
          </div>
        ) : stamps.length === 0 ? (
          <div className="arc-empty" onClick={openCreate}>
            <h3>Your scrapbook is empty.</h3>
            <p>Click here to capture your first memory.</p>
          </div>
        ) : (
          <div className="arc-masonry">
            {stamps.map(stamp => (
              <MemoryCard
                key={stamp.id}
                stamp={stamp}
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deletingId === stamp.id}
              />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <>
          <div className="arc-overlay" onClick={closeModal} />
          <div className="arc-modal">
            <button className="arc-modal-close" onClick={closeModal}>×</button>
            <h3 className="arc-modal-title">
              {editing ? 'Modify Memory Stamp' : 'Log New Memory Node'}
            </h3>

            <form
              className="arc-form"
              onSubmit={e => {
                e.preventDefault();
                editing ? handleUpdate() : handleCreate();
              }}
            >
              <div className="arc-fgroup">
                <label className="arc-flabel">Memory Title *</label>
                <input
                  className="arc-finput"
                  type="text"
                  placeholder="e.g. Redwood Solitude Walk"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="arc-fgroup">
                <label className="arc-flabel">Image Source</label>
                <div className="arc-source-toggle">
                  <button
                    type="button"
                    className={`arc-source-btn ${form.source === 'local' ? 'active' : 'inactive'}`}
                    onClick={() => switchSource('local')}
                  >
                    Local Upload
                  </button>
                  <button
                    type="button"
                    className={`arc-source-btn ${form.source === 'remote' ? 'active' : 'inactive'}`}
                    onClick={() => switchSource('remote')}
                  >
                    Remote URL
                  </button>
                </div>
              </div>

              {form.source === 'local' && (
                <div className="arc-fgroup">
                  <label className="arc-flabel">
                    Image File {!editing && '*'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileRef}
                    onChange={handleFile}
                    style={{ display: 'none' }}
                  />
                  <div className="arc-upload-zone">
                    <button
                      type="button"
                      className="arc-upload-btn"
                      onClick={() => fileRef.current?.click()}
                    >
                      {form.file ? 'Replace Image' : 'Choose File'}
                    </button>
                    {form.file && (
                      <span className="arc-upload-status">✓ {form.file.name}</span>
                    )}
                    {!form.file && editing && (
                      <span className="arc-upload-status muted">Keeping existing image</span>
                    )}
                  </div>
                </div>
              )}

              {form.source === 'remote' && (
                <div className="arc-fgroup">
                  <label className="arc-flabel">
                    Remote Image URL {!editing && '*'}
                  </label>
                  <input
                    className="arc-finput"
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={form.remoteUrl}
                    onChange={handleRemoteUrl}
                  />
                </div>
              )}

              {form.previewUrl && (
                <div className="arc-fgroup">
                  <label className="arc-flabel">Preview</label>
                  <div className="arc-preview">
                    <img
                      src={form.previewUrl}
                      alt="Preview"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}

              {formErr && (
                <div className="arc-modal-err">⚠ {formErr}</div>
              )}

              <div className="arc-modal-actions">
                <button
                  type="button"
                  className="arc-mbtn cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`arc-mbtn ${submitBtnClass}`}
                  disabled={submitting || !form.title.trim()}
                >
                  {submitting && <span className="arc-spin" />}
                  {submitting
                    ? 'Saving…'
                    : editing
                      ? 'Commit Update'
                      : 'Archive Memory'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="arc-toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`arc-toast ${t.err ? 'err' : 'ok'}`}>
            {t.err ? '✗' : '✓'} {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}