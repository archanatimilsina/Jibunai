import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { exportNotePdf } from '../../js/noteMarkdownPdf';

const API_BASE = import.meta.env.VITE_API_URL;
const ENDPOINT = `${API_BASE}/api/node-matrix/`;

const DELETE_TIMEOUT = 90_000;

async function deleteNote(url, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELETE_TIMEOUT);
    try {
      const res = await fetch(url, { method: 'DELETE', cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok && res.status >= 500 && i < attempts - 1) {
        lastErr = new Error(`Server error ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
  }
  throw lastErr || new Error('Delete failed');
}

async function noteStillExists(id) {
  try {
    const res = await fetch(ENDPOINT, { cache: 'no-store' });
    if (!res.ok) return true;
    const list = await res.json();
    return list.some((n) => n.id === id);
  } catch {
    return true;
  }
}

const shimmer = keyframes`
  0% { background-position: -500px 0; }
  100% { background-position: 500px 0; }
`;
const spin = keyframes`
  to { transform: rotate(360deg); }
`;
const pop = keyframes`
  from { opacity: 0; transform: translateY(-4px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;
const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const toastIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --page-bg:     #f6f5f0;
    --sidebar-bg:  #eceae3;
    --border:      #d8d4cc;
    --border-soft: #e5e1d8;
    --text:        #1a1a2e;
    --muted:       #7a7567;
    --dimmer:      #a8a396;
    --accent:      #2d6a4f;
    --accent-dim:  #245741;
    --accent-soft: rgba(45,106,79,0.10);
    --accent-ring: rgba(45,106,79,0.35);
    --danger:      #c0392b;
    --danger-dim:  #a53125;
    --danger-soft: rgba(192,57,43,0.08);
    --ok:          #2d6a4f;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
    color: var(--text);
    background: var(--page-bg);
    -webkit-font-smoothing: antialiased;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  :focus-visible { outline: 2px solid var(--accent-ring); outline-offset: 2px; }
`;

const ResetButton = styled.button`
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
`;

const Mark = styled.mark`
  background: rgba(0, 122, 255, 0.16);
  color: inherit;
  border-radius: 3px;
  padding: 0 1px;
`;

const AppShell = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: 300px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 900px) {
    width: 100%;
    display: ${p => (p.$hideOnMobile ? 'none' : 'flex')};
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 1.1rem 1rem 0.75rem;
`;

const AppName = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
`;

const NewNoteButton = styled(ResetButton)`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  transition: background 0.15s ease;
  &:hover { background: var(--accent-dim); }
`;

const SearchWrap = styled.div`
  position: relative;
  padding: 0 1rem 0.75rem;
`;

const SearchIconWrap = styled.span`
  position: absolute;
  left: 1.55rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--dimmer);
  display: flex;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2.1rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &::placeholder { color: var(--dimmer); }
  &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
`;

const SearchClearButton = styled(ResetButton)`
  position: absolute;
  right: 1.4rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--dimmer);
  font-size: 0.78rem;
  padding: 0.2rem;
  &:hover { color: var(--text); }
`;

const FilterChips = styled.div`
  display: flex;
  gap: 0.4rem;
  padding: 0 1rem 0.85rem;
`;

const Chip = styled(ResetButton)`
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.32rem 0.75rem;
  border-radius: 999px;
  border: 1px solid ${p => (p.$active ? 'var(--accent)' : 'var(--border)')};
  color: ${p => (p.$active ? '#fff' : 'var(--muted)')};
  background: ${p => (p.$active ? 'var(--accent)' : '#fff')};
  transition: all 0.15s ease;
  &:hover {
    border-color: ${p => (p.$active ? 'var(--accent)' : 'var(--dimmer)')};
    color: ${p => (p.$active ? '#fff' : 'var(--text)')};
  }
`;

const SidebarErrorBox = styled.div`
  margin: 0 1rem 0.75rem;
  padding: 0.55rem 0.7rem;
  background: var(--danger-soft);
  border: 1px solid rgba(255, 59, 48, 0.25);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: var(--danger-dim);
`;

const LinkButton = styled(ResetButton)`
  text-decoration: underline;
  font-weight: 600;
`;

const NoteList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 0.5rem 1rem;
`;

const RowDelete = styled(ResetButton)`
  display: none;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  color: ${p => (p.$selected ? 'rgba(255,255,255,0.85)' : 'var(--dimmer)')};
  flex-shrink: 0;
  transition: background 0.12s ease, color 0.12s ease;
  &:hover {
    background: ${p => (p.$selected ? 'rgba(255,255,255,0.18)' : 'var(--danger-soft)')};
    color: ${p => (p.$selected ? '#fff' : 'var(--danger)')};
  }
`;

const NoteRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  margin-bottom: 0.15rem;
  transition: background 0.12s ease;
  background: ${p => (p.$selected ? 'var(--accent)' : 'transparent')};
  &:hover { background: ${p => (p.$selected ? 'var(--accent)' : 'rgba(0,0,0,0.035)')}; }
  &:hover ${RowDelete} { display: flex; }
  ${p => p.$selected && css`${RowDelete} { display: flex; }`}
`;

const RowTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
`;

const RowTitle = styled.span`
  font-size: 0.88rem;
  font-weight: 700;
  color: ${p => (p.$selected ? '#fff' : 'var(--text)')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
`;

const RowPin = styled.span`
  color: ${p => (p.$selected ? '#fff' : 'var(--accent)')};
  flex-shrink: 0;
  display: flex;
`;

const RowSnippet = styled.div`
  font-size: 0.79rem;
  color: ${p => (p.$selected ? 'rgba(255,255,255,0.78)' : 'var(--muted)')};
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RowDate = styled.div`
  font-size: 0.71rem;
  color: ${p => (p.$selected ? 'rgba(255,255,255,0.78)' : 'var(--dimmer)')};
`;

const RowSkeleton = styled.div`
  height: 52px;
  border-radius: var(--radius-md);
  margin: 0 0.2rem 0.35rem;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 500px 100%;
  animation: ${shimmer} 1.3s infinite linear;
`;

const SidebarEmpty = styled.div`
  text-align: center;
  padding: 3rem 1.25rem;
  color: var(--dimmer);
`;

const SidebarEmptyTitle = styled.div`
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 0.25rem;
`;

const SidebarEmptyDesc = styled.div`
  font-size: 0.78rem;
  line-height: 1.5;
`;

const DetailPaneEl = styled.section`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  height: 100vh;

  @media (max-width: 900px) {
    display: ${p => (p.$hideOnMobile ? 'none' : 'flex')};
  }
`;

const DetailEmpty = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--dimmer);
  text-align: center;
  gap: 0.3rem;
`;

const DetailEmptyTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--muted);
`;

const DetailEmptyDesc = styled.div`
  font-size: 0.82rem;
`;

const DetailTopbar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border-soft);
`;

const BackButton = styled(ResetButton)`
  display: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  color: var(--accent);
  margin-right: 0.2rem;
  &:hover { background: rgba(0, 0, 0, 0.04); }

  @media (max-width: 900px) { display: flex; }
`;

const TbAction = styled(ResetButton)`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${p => (p.$active ? 'var(--accent)' : 'var(--muted)')};
  padding: 0.4rem 0.65rem;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease, color 0.15s ease;
  &:hover {
    background: ${p => (p.$danger ? 'var(--danger-soft)' : 'rgba(0,0,0,0.045)')};
    color: ${p => (p.$danger ? 'var(--danger-dim)' : 'var(--text)')};
  }
`;

const TopbarSpacer = styled.div`
  flex: 1;
`;

const SaveStatusSpan = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  flex-shrink: 0;
  color: ${p => (p.$status === 'saving' ? 'var(--muted)' : p.$status === 'saved' ? 'var(--ok)' : 'var(--dimmer)')};
`;

const SaveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
`;

const DetailEditor = styled.textarea`
  flex: 1;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  resize: none;
  border: none;
  background: transparent;
  padding: 2rem 2.5rem 3rem;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--text);
  &::placeholder { color: var(--dimmer); }
  &:focus { outline: none; }

  @media (max-width: 900px) { padding: 1.25rem 1.25rem 3rem; }
`;

const InlineErrorBox = styled.div`
  margin: 0.75rem 1rem 0;
  padding: 0.5rem 0.7rem;
  background: var(--danger-soft);
  border: 1px solid rgba(255, 59, 48, 0.25);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--danger-dim);
`;

const ContextMenuBox = styled.div`
  position: fixed;
  z-index: 500;
  min-width: 190px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16);
  padding: 0.35rem;
  animation: ${pop} 0.12s ease;
`;

const ContextMenuButton = styled(ResetButton)`
  width: 100%;
  text-align: left;
  font-size: 0.84rem;
  padding: 0.5rem 0.65rem;
  border-radius: var(--radius-sm);
  color: ${p => (p.$danger ? 'var(--danger-dim)' : 'var(--text)')};
  &:hover { background: ${p => (p.$danger ? 'var(--danger-soft)' : 'rgba(0,0,0,0.045)')}; }
`;

const CmDivider = styled.div`
  height: 1px;
  background: var(--border-soft);
  margin: 0.3rem 0.25rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 600;
  padding: 1.5rem;
  animation: ${fade} 0.15s ease;
`;

const ModalBox = styled.div`
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 1.6rem;
  width: min(340px, 100%);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
`;

const ModalTitle = styled.div`
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 0.4rem;
`;

const ModalDesc = styled.div`
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.55;
  margin-bottom: 1.3rem;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const Btn = styled(ResetButton)`
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.5rem 0.95rem;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  ${p => p.$variant === 'secondary' && css`
    border: 1px solid var(--border);
    color: var(--muted);
    &:hover { background: rgba(0, 0, 0, 0.04); color: var(--text); }
  `}
  ${p => p.$variant === 'danger' && css`
    background: var(--danger);
    color: #fff;
    &:hover { background: var(--danger-dim); }
  `}
`;

const SpinSpan = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  margin-right: 5px;
  vertical-align: middle;
`;

const ToastWrap = styled.div`
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 700;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ToastBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid var(--border);
  border-left: 3px solid ${p => (p.$err ? 'var(--danger)' : 'var(--ok)')};
  border-radius: var(--radius-md);
  padding: 0.6rem 0.9rem;
  font-size: 0.82rem;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14);
  animation: ${toastIn} 0.2s ease;
  max-width: 300px;
`;

const PIN_KEY = 'notes:pinned-ids';

const parseError = async (res) => {
  try {
    const data = await res.json();
    if (typeof data === 'object') {
      return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ');
    }
    return String(data);
  } catch {
    return `Server error (${res.status})`;
  }
};

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};


function firstLine(text) {
  const lines = (text || '').split('\n');
  for (const l of lines) if (l.trim()) return l.trim();
  return '';
}


function splitTitleBody(content) {
  const raw = (content || '').replace(/^\n+/, '');
  const nl = raw.indexOf('\n');
  let title = nl === -1 ? raw : raw.slice(0, nl);
  let body = nl === -1 ? '' : raw.slice(nl + 1);
  title = title.trim();
  if (!title) title = 'New Note';
  if (title.length > 140) {
    body = title.slice(140) + (body ? '\n' + body : '');
    title = title.slice(0, 140);
  }
  return { title, body };
}

function composeContent(note) {
  if (!note) return '';
  const title = note.title || '';
  const body = note.text || '';
  return body ? `${title}\n${body}` : title;
}


function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    console.error(`[Notes] could not read ${key} from storage:`, e);
    return new Set();
  }
}
function saveIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error(`[Notes] could not persist ${key} to storage:`, e);
  }
}

function wrapHighlights(str, q, keyPrefix) {
  const s = str || '';
  if (!q) return s;
  const lower = s.toLowerCase();
  const needle = q.toLowerCase();
  const parts = [];
  let start = 0, idx, key = 0;
  while ((idx = lower.indexOf(needle, start)) !== -1) {
    if (idx > start) parts.push(s.slice(start, idx));
    parts.push(<Mark key={`${keyPrefix}-m${key++}`}>{s.slice(idx, idx + needle.length)}</Mark>);
    start = idx + needle.length;
  }
  if (start < s.length) parts.push(s.slice(start));
  return parts.length ? parts : s;
}

function IconPlus() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function IconSearch() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function IconPin({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14l-1.6-1.6a2.7 2.7 0 0 1-.8-1.9V9a4.6 4.6 0 1 0-9.2 0v4.5c0 .7-.3 1.4-.8 1.9L5 17z" />
    </svg>
  );
}
function IconCopy() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function IconDuplicate() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V4a2 2 0 0 1 2-2h10" /></svg>;
}
function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>;
}
function IconBack() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function IconDownload() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(null);

  const [selectedId, setSelectedId] = useState(null); 
  const [content, setContent] = useState('');       
  const [saveStatus, setSaveStatus] = useState('idle'); 
  const [saveErr, setSaveErr] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [pinned, setPinned] = useState(() => new Set());
  const [contextMenu, setContextMenu] = useState(null);

  const searchRef = useRef(null);
  const editorRef = useRef(null);
  const autosaveTimer = useRef(null);
  const pendingRef = useRef(null);     
  const draftCreatingRef = useRef(false);
  const draftQueuedRef = useRef(null);
  const selectedIdRef = useRef(null);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, err }].slice(-2));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' });
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
  useEffect(() => { setPinned(loadIdSet(PIN_KEY)); }, []);
  useEffect(() => { saveIdSet(PIN_KEY, pinned); }, [pinned]);
  useEffect(() => () => clearTimeout(autosaveTimer.current), []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [query]);
  const q = debouncedQuery;

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, [contextMenu]);


  const commitSave = async (id, text) => {
    if (!text || !text.trim()) return true; 
    const { title, body } = splitTitleBody(text);

    if (id === 'draft') {
      if (draftCreatingRef.current) { draftQueuedRef.current = text; return true; }
      draftCreatingRef.current = true;
      setSaveStatus('saving');
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji: '📝', title, text: body }),
        });
        if (!res.ok) {
          setSaveErr(await parseError(res));
          setSaveStatus('idle');
          draftCreatingRef.current = false;
          return false;
        }
        const created = await res.json();
        setNotes(prev => [created, ...prev]);
        if (selectedIdRef.current === 'draft') setSelectedId(created.id);
        setSaveStatus('saved');
        setSaveErr(null);
        draftCreatingRef.current = false;
        const queued = draftQueuedRef.current;
        draftQueuedRef.current = null;
        if (queued !== null) return await commitSave(created.id, queued);
        return true;
      } catch (e) {
        console.error('[Notes] create error:', e);
        setSaveErr('Network error — not saved.');
        setSaveStatus('idle');
        draftCreatingRef.current = false;
        return false;
      }
    }

    setSaveStatus('saving');
    try {
      const res = await fetch(`${ENDPOINT}${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '📝', title, text: body }),
      });
      if (!res.ok) { setSaveErr(await parseError(res)); setSaveStatus('idle'); return false; }
      const updated = await res.json();
      setNotes(prev => prev.map(n => (n.id === id ? updated : n)));
      setSaveStatus('saved');
      setSaveErr(null);
      return true;
    } catch (e) {
      console.error('[Notes] autosave error:', e);
      setSaveErr('Network error — changes are not saved.');
      setSaveStatus('idle');
      return false;
    }
  };

  const scheduleSave = (id, text) => {
    pendingRef.current = { id, content: text };
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const p = pendingRef.current;
      pendingRef.current = null;
      if (p) commitSave(p.id, p.content);
    }, 700);
  };

  const flushPending = async () => {
    clearTimeout(autosaveTimer.current);
    const p = pendingRef.current;
    pendingRef.current = null;
    if (!p) return true;
    return commitSave(p.id, p.content);
  };

  const onContentChange = (value) => {
    setContent(value);
    setSaveErr(null);
    if (selectedId === null) return;
    scheduleSave(selectedId, value);
  };

  const selectNote = async (item) => {
    if (selectedId === item.id) return;
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save your last note — staying here so nothing is lost.", true); return; }
    setContextMenu(null);
    setSelectedId(item.id);
    setContent(composeContent(item));
    setSaveStatus('idle');
    setSaveErr(null);
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const startCreate = async () => {
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save your last note — staying here so nothing is lost.", true); return; }
    setContextMenu(null);
    setSelectedId('draft');
    setContent('');
    setSaveStatus('idle');
    setSaveErr(null);
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const handleBack = async () => {
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save — staying here so nothing is lost.", true); return; }
    setSelectedId(null);
    setContent('');
  };


  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); startCreate(); return; }
      if (e.key === 'Escape') {
        if (contextMenu) { setContextMenu(null); return; }
        if (confirmDeleteId !== null) { if (deletingId === null) setConfirmDeleteId(null); return; }
        if (document.activeElement === searchRef.current) searchRef.current.blur();
        else if (document.activeElement === editorRef.current) editorRef.current.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [contextMenu, confirmDeleteId, deletingId]);

  const filteredSortedNotes = useMemo(() => {
    let list = notes;
    if (filter === 'pinned') list = list.filter(n => pinned.has(n.id));
    if (q) list = list.filter(n => (n.title || '').toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      const aPin = pinned.has(a.id), bPin = pinned.has(b.id);
      if (aPin !== bPin) return aPin ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [notes, filter, q, pinned]);

 
  const draftRow = useMemo(() => {
    if (selectedId !== 'draft') return null;
    const { title, body } = splitTitleBody(content);
    return { id: 'draft', title: content.trim() ? title : 'New Note', text: body, created_at: new Date().toISOString(), isDraft: true };
  }, [selectedId, content]);

  const listItems = draftRow ? [draftRow, ...filteredSortedNotes] : filteredSortedNotes;

  const emptyState = useMemo(() => {
    if (notes.length === 0 && !draftRow) return { title: 'No notes yet', desc: 'Create your first note to get started.' };
    if (q) return { title: 'No notes found', desc: 'Try a different keyword.' };
    if (filter === 'pinned') return { title: 'No pinned notes', desc: 'Pin a note from its menu to see it here.' };
    return { title: 'No notes yet', desc: 'Create your first note to get started.' };
  }, [notes.length, draftRow, q, filter]);

  const requestDelete = (id) => {
    if (id === 'draft') {
      if (pendingRef.current) {
        clearTimeout(autosaveTimer.current);
        pendingRef.current = null;
      }
      setSelectedId(null);
      setContent('');
      setSaveStatus('idle');
      setSaveErr(null);
      setContextMenu(null);
      return;
    }
    setConfirmDeleteId(id);
  };
  const cancelDelete = () => setConfirmDeleteId(null);

  const handleDelete = async (id) => {
    if (pendingRef.current?.id === id) {
      clearTimeout(autosaveTimer.current);
      pendingRef.current = null;
    }
    setDeletingId(id);
    let success = false;
    try {
      const res = await deleteNote(`${ENDPOINT}${id}/`);
      success = res.ok || res.status === 204 || res.status === 404;
      if (!success) toast('Delete failed. Please try again.', true);
    } catch (e) {
      console.error('[Notes] delete error:', e);
      success = !(await noteStillExists(id));
      if (!success) toast('Network error — could not delete.', true);
    }
    if (success) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedIdRef.current === id) {
        setSelectedId(null);
        setContent('');
        setSaveStatus('idle');
        setSaveErr(null);
      }
      toast('Note deleted');
    }
    setDeletingId(null);
    return success;
  };

  const confirmDeleteNow = async () => {
    const id = confirmDeleteId;
    if (id == null) return;
    const ok = await handleDelete(id);
    if (ok) setConfirmDeleteId(null);
  };

  const togglePin = (id) => setPinned(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const duplicateNote = async (note) => {
    const ok = await flushPending();
    if (!ok) { toast("Couldn't save your last note — try again.", true); return; }
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '📝', title: `${note.title} copy`, text: note.text }),
      });
      if (!res.ok) { toast(await parseError(res), true); return; }
      const created = await res.json();
      setNotes(prev => [created, ...prev]);
      setContextMenu(null);
      setSelectedId(created.id);
      setContent(composeContent(created));
      setSaveStatus('idle');
      toast('Note duplicated ✓');
    } catch (e) {
      console.error('[Notes] duplicate error:', e);
      toast('Network error — could not duplicate.', true);
    }
  };

  const copyToClipboard = async (str) => {
    try {
      await navigator.clipboard.writeText(str || '');
      toast('Copied ✓');
    } catch (e) {
      console.error('[Notes] clipboard error:', e);
      toast('Could not copy — clipboard unavailable.', true);
    }
  };

  const downloadNotePdf = async (note) => {
    try {
      const { title, body } = splitTitleBody(note ? composeContent(note) : content);
      const { isMarkdown } = await exportNotePdf({ title, body });
      toast(isMarkdown ? 'Markdown detected — formatted PDF downloaded ✓' : 'PDF downloaded ✓');
    } catch (e) {
      console.error('[Notes] PDF export error:', e);
      toast('Could not create the PDF.', true);
    }
  };

  const openContextMenu = (e, note) => {
    e.preventDefault();
    setContextMenu({ id: note.id, x: e.clientX, y: e.clientY });
  };

  const isPinnedSelected = typeof selectedId === 'number' && pinned.has(selectedId);

  return (
    <>
      <GlobalStyle />
      <AppShell>

        <Sidebar $hideOnMobile={selectedId !== null}>
          <SidebarHeader>
            <AppName>Notes</AppName>
            <NewNoteButton onClick={startCreate}><IconPlus /> New Note</NewNoteButton>
          </SidebarHeader>

          <SearchWrap>
            <SearchIconWrap><IconSearch /></SearchIconWrap>
            <SearchInput
              ref={searchRef}
              type="text"
              placeholder="Search"
              aria-label="Search notes"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <SearchClearButton aria-label="Clear search" onClick={() => setQuery('')}>✕</SearchClearButton>}
          </SearchWrap>

          <FilterChips role="tablist" aria-label="Filter notes">
            <Chip role="tab" aria-selected={filter === 'all'} $active={filter === 'all'} onClick={() => setFilter('all')}>All Notes</Chip>
            <Chip role="tab" aria-selected={filter === 'pinned'} $active={filter === 'pinned'} onClick={() => setFilter('pinned')}>Pinned</Chip>
          </FilterChips>

          {fetchErr && (
            <SidebarErrorBox>Couldn't load notes. <LinkButton onClick={fetchNotes}>Retry</LinkButton></SidebarErrorBox>
          )}

          <NoteList>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
            ) : listItems.length === 0 ? (
              <SidebarEmpty>
                <SidebarEmptyTitle>{emptyState.title}</SidebarEmptyTitle>
                <SidebarEmptyDesc>{emptyState.desc}</SidebarEmptyDesc>
              </SidebarEmpty>
            ) : (
              listItems.map(item => {
                const isSelected = selectedId === item.id;
                const isPinned = pinned.has(item.id);
                return (
                  <NoteRow
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    aria-current={isSelected}
                    aria-label={`Open note ${item.title || 'New Note'}`}
                    $selected={isSelected}
                    onClick={() => selectNote(item)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNote(item); } }}
                    onContextMenu={item.isDraft ? undefined : (e) => openContextMenu(e, item)}
                  >
                    <RowTop>
                      <RowTitle $selected={isSelected}>{wrapHighlights(item.title || 'New Note', q, `rt-${item.id}`)}</RowTitle>
                      {isPinned && <RowPin $selected={isSelected} aria-hidden="true"><IconPin filled /></RowPin>}
                      <RowDelete
                        type="button"
                        $selected={isSelected}
                        title={item.isDraft ? 'Discard draft' : 'Delete note'}
                        aria-label={item.isDraft ? 'Discard draft' : `Delete ${item.title || 'note'}`}
                        onClick={e => { e.stopPropagation(); requestDelete(item.id); }}
                      >
                        <IconTrash />
                      </RowDelete>
                    </RowTop>
                    <RowSnippet $selected={isSelected}>{wrapHighlights(firstLine(item.text) || 'No additional text', q, `rs-${item.id}`)}</RowSnippet>
                    <RowDate $selected={isSelected}>{item.isDraft ? 'Just now' : fmtDate(item.created_at)}</RowDate>
                  </NoteRow>
                );
              })
            )}
          </NoteList>
        </Sidebar>

        <DetailPaneEl $hideOnMobile={selectedId === null}>
          {selectedId === null ? (
            <DetailEmpty>
              <DetailEmptyTitle>Select a note</DetailEmptyTitle>
              <DetailEmptyDesc>Choose a note from the list, or create a new one.</DetailEmptyDesc>
            </DetailEmpty>
          ) : (
            <>
              <DetailTopbar>
                <BackButton aria-label="Back to list" onClick={handleBack}><IconBack /></BackButton>

                {content.trim() && (
                  <>
                    <TbAction onClick={() => copyToClipboard(content)}><IconCopy /> Copy</TbAction>
                    <TbAction title="Download as PDF" onClick={() => downloadNotePdf()}><IconDownload /> PDF</TbAction>
                  </>
                )}
                {typeof selectedId === 'number' && (
                  <>
                    <TbAction
                      $active={isPinnedSelected}
                      title={isPinnedSelected ? 'Unpin' : 'Pin'}
                      onClick={() => togglePin(selectedId)}
                    >
                      <IconPin filled={isPinnedSelected} /> {isPinnedSelected ? 'Pinned' : 'Pin'}
                    </TbAction>
                    <TbAction onClick={() => duplicateNote(notes.find(n => n.id === selectedId))}><IconDuplicate /> Duplicate</TbAction>
                    <TbAction $danger onClick={() => requestDelete(selectedId)}><IconTrash /> Delete</TbAction>
                  </>
                )}

                <TopbarSpacer />
                <SaveStatusSpan $status={saveStatus}>
                  {saveStatus === 'saving' && (<><SaveDot />Saving…</>)}
                  {saveStatus === 'saved' && (<><SaveDot />Saved</>)}
                </SaveStatusSpan>
              </DetailTopbar>

              {saveErr && <InlineErrorBox>⚠ {saveErr}</InlineErrorBox>}

              <DetailEditor
                ref={editorRef}
                value={content}
                placeholder="Start typing…"
                aria-label="Note text"
                autoFocus={selectedId === 'draft'}
                onChange={e => onContentChange(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
              />
            </>
          )}
        </DetailPaneEl>
      </AppShell>

      {contextMenu && (() => {
        const cmNote = notes.find(n => n.id === contextMenu.id);
        if (!cmNote) return null;
        const isPinned = pinned.has(cmNote.id);
        const x = Math.min(contextMenu.x, window.innerWidth - 210);
        const y = Math.min(contextMenu.y, window.innerHeight - 240);
        return (
          <ContextMenuBox role="menu" style={{ top: y, left: x }} onClick={e => e.stopPropagation()}>
            <ContextMenuButton role="menuitem" onClick={() => { selectNote(cmNote); setContextMenu(null); }}>Open</ContextMenuButton>
            <ContextMenuButton role="menuitem" onClick={() => duplicateNote(cmNote)}>Duplicate</ContextMenuButton>
            <ContextMenuButton role="menuitem" onClick={() => { copyToClipboard(composeContent(cmNote)); setContextMenu(null); }}>Copy</ContextMenuButton>
            <ContextMenuButton role="menuitem" onClick={() => { downloadNotePdf(cmNote); setContextMenu(null); }}>Download as PDF</ContextMenuButton>
            <CmDivider />
            <ContextMenuButton role="menuitem" onClick={() => { togglePin(cmNote.id); setContextMenu(null); }}>{isPinned ? 'Unpin' : 'Pin'} note</ContextMenuButton>
            <CmDivider />
            <ContextMenuButton role="menuitem" $danger onClick={() => { requestDelete(cmNote.id); setContextMenu(null); }}>Delete note</ContextMenuButton>
          </ContextMenuBox>
        );
      })()}

      {confirmDeleteId !== null && (
        <ModalOverlay onClick={() => { if (deletingId === null) cancelDelete(); }}>
          <ModalBox role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" onClick={e => e.stopPropagation()}>
            <ModalTitle id="delete-modal-title">Delete this note?</ModalTitle>
            <ModalDesc>This can't be undone. The note will be permanently removed.</ModalDesc>
            <ModalActions>
              <Btn $variant="secondary" onClick={cancelDelete} disabled={deletingId === confirmDeleteId}>Cancel</Btn>
              <Btn $variant="danger" onClick={confirmDeleteNow} disabled={deletingId === confirmDeleteId}>
                {deletingId === confirmDeleteId && <SpinSpan />}
                {deletingId === confirmDeleteId ? 'Deleting…' : 'Delete'}
              </Btn>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      <ToastWrap>
        {toasts.map(t => (
          <ToastBox key={t.id} $err={t.err}>{t.err ? '✗' : '✓'} {t.msg}</ToastBox>
        ))}
      </ToastWrap>
    </>
  );
}