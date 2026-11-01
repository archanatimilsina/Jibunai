import React, { useState, useRef, useEffect, useCallback } from 'react';
const API_BASE = import.meta.env.VITE_API_URL;
export const revalidate = 60;
const ENDPOINT = `${API_BASE}/api/archive/`;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --dark:       #1a1a2e;
    --soft:       #7a7567;
    --border:     #d8d4cc;
    --accent:     #eceae3;
    --green:      #2d6a4f;
    --green-dim:  #245741;
    --danger:     #c0392b;
    --white:      #ffffff;
    --paper:      #ffffff;
    --bg:         #f6f5f0;
  }

  body {
    background-color: var(--bg);
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  
  .arc-page {
    max-width: 1300px;
    margin: 0 auto;
    padding: 5rem 2rem 10rem;
    animation: arcFadeUp 0.5s ease forwards;
  }

  
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

  
  .arc-masonry { column-count: 3; column-gap: 2.2rem; padding: 1rem; }
  @media (max-width: 1024px) { .arc-masonry { column-count: 2; } }
  @media (max-width: 580px)  { .arc-masonry { column-count: 1; } }

  
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
    border-radius: 6px;
    background: var(--accent);
    margin-bottom: 1.1rem;
    min-height: 120px;
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    font: inherit;
    cursor: zoom-in;
  }
  .arc-img-box img {
    width: 100%;
    display: block;
    object-fit: cover;
    transition: transform 1.5s ease;
  }
  .arc-card-wrap:hover .arc-img-box img { transform: scale(1.08); }

  
  .arc-img-hint {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    display: inline-flex; align-items: center; gap: 0.35rem;
    background: rgba(255,255,255,0.94); color: var(--dark);
    padding: 0.5rem 0.95rem; border-radius: 50px;
    font-family: 'Syne', sans-serif; font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.2px;
    opacity: 0; pointer-events: none;
    transition: opacity 0.25s ease, transform 0.25s ease;
    box-shadow: 0 8px 24px rgba(0,0,0,0.22);
  }
  .arc-img-box:hover .arc-img-hint {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  .arc-img-empty {
    height: 140px;
    display: flex; align-items: center; justify-content: center;
    color: #b0a898; font-size: 0.8rem; font-family: monospace;
  }

  
  .arc-card-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #ece7df;
  }
  .arc-abtn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.32rem;
    font-family: 'Syne', sans-serif; font-size: 0.66rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.6px;
    padding: 0.55rem 0.4rem; border-radius: 8px; cursor: pointer;
    border: 1.5px solid var(--border); background: var(--white); color: var(--dark);
    transition: all 0.18s ease;
  }
  .arc-abtn:hover { transform: translateY(-1px); border-color: var(--dark); }
  .arc-abtn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .arc-abtn.preview { background: var(--dark); border-color: var(--dark); color: var(--white); }
  .arc-abtn.preview:hover { background: var(--green); border-color: var(--green); }
  .arc-abtn.danger { color: var(--danger); }
  .arc-abtn.danger:hover { border-color: var(--danger); background: #fff5f5; }
  @media (max-width: 360px) { .arc-abtn { font-size: 0.6rem; letter-spacing: 0; } }

  .arc-card-stamp { font-family: monospace; font-size: 0.68rem; color: #b0a898; margin-bottom: 0.22rem; }
  .arc-card-title { font-family: 'Syne', sans-serif; font-size: 0.96rem; font-weight: 700; color: var(--dark); line-height: 1.35; }

  
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

  
  .arc-overlay {
    position: fixed; inset: 0;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    z-index: 1000;
    animation: arcOverlayIn 0.3s ease;
  }

  
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

  
  .arc-preview img {
    width: 100%; max-height: 130px;
    object-fit: contain; border-radius: 5px;
    border: 1px solid var(--border); background: #f0ece6;
  }

  
  .arc-modal-err {
    padding: 0.6rem 0.9rem;
    background: #fff5f5; border: 1px solid #fed7d7;
    border-radius: 6px; font-size: 0.82rem; color: var(--danger);
  }

  
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

  
  .arc-spin {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid transparent; border-top-color: currentColor;
    border-radius: 50%; animation: arcSpin 0.7s linear infinite;
    flex-shrink: 0;
  }

  
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

  
  .arc-lb {
    position: fixed; inset: 0; z-index: 1100;
    display: flex; flex-direction: column;
    background: rgba(9, 12, 20, 0.95);
    backdrop-filter: blur(16px);
    animation: arcOverlayIn 0.28s ease;
  }
  .arc-lb-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 1.1rem 1.4rem;
    background: linear-gradient(rgba(9,12,20,0.75), rgba(9,12,20,0));
  }
  .arc-lb-meta { min-width: 0; }
  .arc-lb-title {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.02rem;
    color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .arc-lb-sub {
    font-family: monospace; font-size: 0.72rem;
    color: rgba(255,255,255,0.5); margin-top: 0.15rem;
  }
  .arc-lb-actions { display: flex; gap: 0.55rem; flex-shrink: 0; }
  .arc-lb-btn {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-family: 'Syne', sans-serif; font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px;
    padding: 0.6rem 1rem; border-radius: 50px; cursor: pointer;
    background: rgba(255,255,255,0.08); color: #fff;
    border: 1px solid rgba(255,255,255,0.18);
    transition: all 0.18s ease;
  }
  .arc-lb-btn:hover { background: rgba(255,255,255,0.18); transform: translateY(-1px); }
  .arc-lb-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .arc-lb-btn.primary { background: var(--green); border-color: var(--green); }
  .arc-lb-btn.primary:hover { background: var(--green-dim); border-color: var(--green-dim); }

  .arc-lb-stage {
    flex: 1; min-height: 0; position: relative;
    display: flex; align-items: center; justify-content: center;
    padding: 0 4.5rem 0.5rem;
  }
  .arc-lb-stage img {
    max-width: 100%; max-height: 100%;
    object-fit: contain; border-radius: 8px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    opacity: 0; transition: opacity 0.4s ease;
  }
  .arc-lb-stage img.is-loaded { opacity: 1; }
  .arc-lb-status {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.85); font-size: 0.9rem; pointer-events: none;
  }
  .arc-spin-lg { width: 34px; height: 34px; border-width: 3px; color: var(--green); }
  .arc-lb-nav {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 48px; height: 48px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.1); color: #fff;
    border: 1px solid rgba(255,255,255,0.2); cursor: pointer;
    backdrop-filter: blur(6px); transition: all 0.18s ease;
  }
  .arc-lb-nav:hover { background: rgba(255,255,255,0.22); transform: translateY(-50%) scale(1.06); }
  .arc-lb-nav.prev { left: 1.1rem; }
  .arc-lb-nav.next { right: 1.1rem; }
  .arc-lb-caption {
    text-align: center; font-size: 0.78rem; color: rgba(255,255,255,0.45);
    padding: 0.75rem 1rem 1.4rem;
  }
  @media (max-width: 620px) {
    .arc-lb-bar { padding: 0.9rem 1rem; }
    .arc-lb-btn-txt { display: none; }
    .arc-lb-stage { padding: 0 1rem 0.5rem; }
    .arc-lb-nav { width: 40px; height: 40px; }
    .arc-lb-nav.prev { left: 0.5rem; }
    .arc-lb-nav.next { right: 0.5rem; }
  }

  
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

const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const SvgIcon = ({ children, size = 15, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" {...rest}
  >
    {children}
  </svg>
);
const EyeIcon      = (p) => <SvgIcon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></SvgIcon>;
const PenIcon      = (p) => <SvgIcon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></SvgIcon>;
const TrashIcon    = (p) => <SvgIcon {...p}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></SvgIcon>;
const DownloadIcon = (p) => <SvgIcon {...p}><path d="M21 15v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></SvgIcon>;
const XIcon        = (p) => <SvgIcon {...p}><path d="M18 6 6 18M6 6l12 12" /></SvgIcon>;
const ChevronLeft  = (p) => <SvgIcon {...p}><path d="m15 18-6-6 6-6" /></SvgIcon>;
const ChevronRight = (p) => <SvgIcon {...p}><path d="m9 18 6-6-6-6" /></SvgIcon>;


function MemoryCard({ stamp, onEdit, onDelete, onPreview, deleting }) {
  const tilt    = React.useMemo(() => (((stamp.id * 7919) % 100) / 100 - 0.5) * 6, [stamp.id]);
  const tapePos = stamp.id % 2 === 0 ? 'left' : 'right';

  return (
    <div
      className="arc-card-wrap"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <article className="arc-polaroid">
        <div className={`arc-tape ${tapePos}`} />
        <button
          type="button"
          className="arc-img-box"
          onClick={() => onPreview(stamp)}
          aria-label={`Preview ${stamp.title}`}
        >
          {stamp.image ? (
            <img src={stamp.image} alt={stamp.title} loading="lazy" />
          ) : (
           
            <span className="arc-img-empty">no image</span>
          )}
          <span className="arc-img-hint">
            <EyeIcon size={15} /> Preview
          </span>
        </button>
        <footer>
          <p className="arc-card-stamp">#{stamp.id} · {fmtDate(stamp.timestamp)}</p>
          <p className="arc-card-title">{stamp.title}</p>
        </footer>
        <div className="arc-card-actions">
          <button type="button" className="arc-abtn preview" onClick={() => onPreview(stamp)}>
            <EyeIcon size={14} /> Preview
          </button>
          <button type="button" className="arc-abtn edit" onClick={() => onEdit(stamp)}>
            <PenIcon size={14} /> Edit
          </button>
          <button
            type="button"
            className="arc-abtn danger"
            disabled={deleting}
            onClick={() => onDelete(stamp.id)}
          >
            {deleting ? <span className="arc-spin" /> : <TrashIcon size={14} />} Delete
          </button>
        </div>
      </article>
    </div>
  );
}

function Lightbox({ stamps, index, onClose, onPrev, onNext, onDownload, downloadingId }) {
  const stamp = stamps[index];
  const [imgState, setImgState] = useState({ src: null, status: 'loading' });

  const status = imgState.src === stamp?.image ? imgState.status : 'loading';
  const loaded = status === 'loaded';
  const failed = status === 'failed';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext]);

  if (!stamp) return null;
  const downloading = downloadingId === stamp.id;

  return (
    <div
      className="arc-lb"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${stamp.title}`}
    >
      <div className="arc-lb-bar">
        <div className="arc-lb-meta">
          <p className="arc-lb-title">{stamp.title}</p>
          <p className="arc-lb-sub">
            #{stamp.id} · {fmtDate(stamp.timestamp)} · {index + 1} / {stamps.length}
          </p>
        </div>
        <div className="arc-lb-actions">
          <button
            type="button"
            className="arc-lb-btn primary"
            onClick={() => onDownload(stamp)}
            disabled={downloading}
          >
            {downloading ? <span className="arc-spin" /> : <DownloadIcon size={15} />}
            Download
          </button>
          <button
            type="button"
            className="arc-lb-btn"
            onClick={onClose}
            aria-label="Close preview"
          >
            <XIcon size={16} /> <span className="arc-lb-btn-txt">Close</span>
          </button>
        </div>
      </div>

      <div className="arc-lb-stage" onClick={onClose}>
        {stamp.image && !failed && (
          <img
            key={stamp.image}
            src={stamp.image}
            alt={stamp.title}
            className={loaded ? 'is-loaded' : ''}
            onLoad={() => setImgState({ src: stamp.image, status: 'loaded' })}
            onError={() => setImgState({ src: stamp.image, status: 'failed' })}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {status !== 'loaded' && (
          <div className="arc-lb-status">
            {failed
              ? '⚠ This image could not be loaded'
              : <span className="arc-spin arc-spin-lg" />}
          </div>
        )}
      </div>

      {stamps.length > 1 && (
        <>
          <button type="button" className="arc-lb-nav prev" onClick={onPrev} aria-label="Previous image">
            <ChevronLeft size={22} />
          </button>
          <button type="button" className="arc-lb-nav next" onClick={onNext} aria-label="Next image">
            <ChevronRight size={22} />
          </button>
        </>
      )}

      <p className="arc-lb-caption">
        Click the backdrop, press Esc, or use ← → to move between images
      </p>
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

  const [previewIndex,  setPreviewIndex]  = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

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
      const res = await fetch(ENDPOINT,{next: { revalidate: 60 } });
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
      previewUrl: stamp.image  || '',
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
        res = await fetch(ENDPOINT, { next: { revalidate: 60 } ,method: 'POST', body: fd });
      } else {
        res = await fetch(ENDPOINT, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          next: { revalidate: 60 } ,
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
        res = await fetch(url, { method: 'PATCH',next: { revalidate: 60 } , body: fd });

      } else if (form.source === 'remote' && form.remoteUrl !== editing.remote_url) {
        res = await fetch(url, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          next: { revalidate: 60 } ,
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
          next: { revalidate: 60 } ,
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
      const res = await fetch(`${ENDPOINT}${id}/`, { method: 'DELETE',next: { revalidate: 60 }  });
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

  const openPreview = useCallback((stamp) => {
    setPreviewIndex(stamps.findIndex((s) => s.id === stamp.id));
  }, [stamps]);
  const closePreview = useCallback(() => setPreviewIndex(null), []);
  const prevPreview  = useCallback(() => {
    setPreviewIndex((i) => (i === null ? null : (i - 1 + stamps.length) % stamps.length));
  }, [stamps.length]);
  const nextPreview  = useCallback(() => {
    setPreviewIndex((i) => (i === null ? null : (i + 1) % stamps.length));
  }, [stamps.length]);

  const downloadImage = useCallback(async (stamp) => {
    if (!stamp?.image) return;
    setDownloadingId(stamp.id);
    const base = slugify(stamp.title) || `memory-${stamp.id}`;
    try {
      const res = await fetch(stamp.image, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = ((blob.type.split('/')[1] || 'jpg').split('+')[0]).replace('jpeg', 'jpg');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('Download started ✓');
    } catch {
      const a = document.createElement('a');
      a.href = stamp.image;
      a.download = base;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Opened in a new tab — save it from there', true);
    } finally {
      setDownloadingId(null);
    }
  }, [toast]);

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
                onPreview={openPreview}
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

      {previewIndex !== null && stamps[previewIndex] && (
        <Lightbox
          stamps={stamps}
          index={previewIndex}
          onClose={closePreview}
          onPrev={prevPreview}
          onNext={nextPreview}
          onDownload={downloadImage}
          downloadingId={downloadingId}
        />
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