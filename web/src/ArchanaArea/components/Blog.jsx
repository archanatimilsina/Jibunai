import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { exportBlogPdf } from '../../js/noteMarkdownPdf';

const API_BASE = import.meta.env.VITE_API_URL;
const BASE = `${API_BASE}/api`;
const POSTS = `${BASE}/blog/posts/`;
const CATEGORIES = `${BASE}/blog/categories/`;
const COMMENTS = `${BASE}/blog/comments/`;
const IMAGES = `${BASE}/blog/images/`;
const LIKED_KEY = 'blog:liked-ids';

const compressImage = async (file, maxDim = 1600, quality = 0.82) => {
  if (!file || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width: w, height: h } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    if (scale === 1 && file.size < 350 * 1024) { bitmap.close?.(); return file; }
    const width = Math.max(1, Math.round(w * scale));
    const height = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
};

const C = {
  bg:      '#f6f5f0',
  white:   '#ffffff',
  dark:    '#1a1a2e',
  green:   '#2d6a4f',
  greenLt: '#e4f1ea',
  border:  '#d8d4cc',
  muted:   '#eceae3',
  soft:    '#7a7567',
  gold:    '#d4af37',
  accent:  '#52d68a',
  danger:  '#c0392b',
  dangerLt:'#fdecea',
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const spin = keyframes`to { transform: rotate(360deg); }`;
const pop = keyframes`
  from { opacity: 0; transform: scale(.96); }
  to   { opacity: 1; transform: scale(1); }
`;
const shimmer = keyframes`
  0%   { background-position: -500px 0; }
  100% { background-position: 500px 0; }
`;

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  .blog-scope ::-webkit-scrollbar { width: 8px; height: 8px; }
  .blog-scope ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 8px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
`;

const parseError = async (res) => {
  try {
    const data = await res.json();
    if (data && typeof data === 'object') {
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtRelative = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
};

const loadIdSet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};
const saveIdSet = (key, set) => {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { }
};

const blankForm = () => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: '',
  tags: '',
  author: 'Archana Timilsina',
  status: 'draft',
  isFeatured: false,
});

const postToForm = (p) => ({
  title: p.title || '',
  slug: p.slug || '',
  excerpt: p.excerpt || '',
  content: p.content || '',
  category: p.category ? String(p.category) : '',
  tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
  author: p.author || 'Archana Timilsina',
  status: p.status || 'draft',
  isFeatured: !!p.is_featured,
});

const parseTags = (raw) =>
  (raw || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);

function renderInline(text, keyPrefix) {
  const nodes = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-${k++}`}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={`${keyPrefix}-${k++}`}>{m[3]}</em>);
    else if (m[4] !== undefined) nodes.push(<code key={`${keyPrefix}-${k++}`}>{m[4]}</code>);
    else if (m[5] !== undefined) nodes.push(<img key={`${keyPrefix}-${k++}`} src={m[6]} alt={m[5]} />);
    else if (m[7] !== undefined) nodes.push(<a key={`${keyPrefix}-${k++}`} href={m[8]} target="_blank" rel="noopener noreferrer">{m[7]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdown({ text }) {
  const blocks = useMemo(() => {
    const lines = (text || '').split('\n');
    const out = [];
    let i = 0;
    let list = null;
    let listType = null;
    let key = 0;

    const flushList = () => {
      if (list) {
        out.push(listType === 'ul'
          ? <ul key={`l${key++}`}>{list}</ul>
          : <ol key={`l${key++}`}>{list}</ol>);
        list = null;
        listType = null;
      }
    };

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        flushList();
        const code = [];
        i += 1;
        while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i += 1; }
        i += 1;
        out.push(<pre key={`c${key++}`}><code>{code.join('\n')}</code></pre>);
        continue;
      }

      if (/^\s*$/.test(line)) { flushList(); i += 1; continue; }

      if (/^---+$/.test(line.trim())) { flushList(); out.push(<hr key={`h${key++}`} />); i += 1; continue; }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushList();
        const level = Math.min(heading[1].length, 6);
        const Tag = `h${level}`;
        out.push(<Tag key={`hd${key++}`}>{renderInline(heading[2], `hd${key}`)}</Tag>);
        i += 1;
        continue;
      }

      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        flushList();
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
        out.push(<blockquote key={`q${key++}`}>{renderInline(buf.join(' '), `q${key}`)}</blockquote>);
        continue;
      }

      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ul || ol) {
        const type = ul ? 'ul' : 'ol';
        if (list && listType !== type) flushList();
        listType = type;
        list = list || [];
        list.push(<li key={`li${key++}`}>{renderInline((ul || ol)[1], `li${key}`)}</li>);
        i += 1;
        continue;
      }

      flushList();
      const buf = [];
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !lines[i].trim().startsWith('```') &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^---+$/.test(lines[i].trim())
      ) { buf.push(lines[i]); i += 1; }
      out.push(<p key={`p${key++}`}>{renderInline(buf.join(' '), `p${key}`)}</p>);
    }
    flushList();
    return out;
  }, [text]);

  if (!text || !text.trim()) {
    return <MdEmpty>Nothing to preview yet — start writing your story.</MdEmpty>;
  }
  return <MdBody>{blocks}</MdBody>;
}

const I = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  search: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  star: (filled) => <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.6 5.8 21 7 14.1 2 9.3 8.9 8.6 12 2" /></svg>,
  eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  heart: (filled) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>,
  chat: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.7 8.7 0 0 1-3.8-.9L3 21l1.9-5a8.4 8.4 0 0 1 8.1-11 8.4 8.4 0 0 1 8 6.5z" /></svg>,
  clock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>,
  image: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  download: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  send: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
};

export default function Blog({ onBack }) {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, views: 0, likes: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const [mode, setMode] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [activeTab, setActiveTab] = useState('write');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);

  const [commentName, setCommentName] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [liked, setLiked] = useState(() => loadIdSet(LIKED_KEY));

  const fileInputRef = useRef(null);
  const inlineInputRef = useRef(null);
  const contentRef = useRef(null);
  const viewedRef = useRef(new Set());

  const [uploadingImage, setUploadingImage] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }].slice(-3));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => { saveIdSet(LIKED_KEY, liked); }, [liked]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(CATEGORIES, { cache: 'no-store' });
      if (!res.ok) throw new Error('categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : data.results || []);
    } catch {
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${POSTS}stats/`, { cache: 'no-store' });
      if (res.ok) setStats(await res.json());
    } catch {
    }
  }, []);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setListError(''); }
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (query.trim()) params.set('search', query.trim());
      if (sort) params.set('ordering', sort);
      params.set('page', String(pageNum));

      const res = await fetch(`${POSTS}?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const results = Array.isArray(data) ? data : data.results || [];
      setPosts((prev) => (append ? [...prev, ...results] : results));
      setTotal(Array.isArray(data) ? results.length : (data.count ?? results.length));
      setPage(pageNum);
    } catch (e) {
      if (append) toast('Could not load more posts.', true);
      else setListError(e.message || 'Could not load posts.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter, categoryFilter, query, sort, toast]);

  useEffect(() => {
    const t = setTimeout(() => fetchPosts(1, false), 280);
    return () => clearTimeout(t);
  }, [fetchPosts]);

  useEffect(() => { fetchCategories(); fetchStats(); }, [fetchCategories, fetchStats]);

  const loadMore = () => {
    if (loadingMore || posts.length >= total) return;
    fetchPosts(page + 1, true);
  };

  const clearCover = useCallback(() => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  }, [coverPreview]);

  const startNew = () => {
    clearCover();
    setRemoveCover(false);
    setForm(blankForm());
    setPost(null);
    setComments([]);
    setActiveId(null);
    setActiveTab('write');
    setSaveError('');
    setDirty(false);
    setMode('new');
  };

  const openPost = useCallback(async (item, asEdit = false) => {
    clearCover();
    setRemoveCover(false);
    setActiveId(item.id);
    setPost(item);
    setForm(postToForm(item));
    setComments([]);
    setActiveTab(asEdit ? 'write' : 'preview');
    setSaveError('');
    setDirty(false);
    setMode(asEdit ? 'edit' : 'view');

    try {
      const res = await fetch(`${POSTS}${item.id}/`, { cache: 'no-store' });
      if (res.ok) {
        const detail = await res.json();
        setPost(detail);
        setComments(detail.comments || []);
        setForm(postToForm(detail));
      }
    } catch { }

    if (!viewedRef.current.has(item.id)) {
      viewedRef.current.add(item.id);
      try {
        const res = await fetch(`${POSTS}${item.id}/view/`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setPosts((prev) => prev.map((p) => (p.id === item.id ? { ...p, views: data.views } : p)));
          setPost((prev) => (prev && prev.id === item.id ? { ...prev, views: data.views } : prev));
        }
      } catch { }
    }
  }, [clearCover]);

  const backToList = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    clearCover();
    setMode(null);
    setActiveId(null);
    setPost(null);
    setForm(blankForm());
    setDirty(false);
    setSaveError('');
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const onPickCover = async (e) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const file = await compressImage(raw);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setRemoveCover(false);
    setDirty(true);
  };

  const handleRemoveCover = () => {
    clearCover();
    setRemoveCover(true);
    setDirty(true);
  };

  const wrapSelection = (before, after = before) => {
    const el = contentRef.current;
    if (!el) { insertAtCursor(`${before}text${after}`); return; }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const selected = el.value.slice(start, end) || 'text';
    const next = el.value.slice(0, start) + before + selected + after + el.value.slice(end);
    updateField('content', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertAtCursor = (snippet) => {
    const el = contentRef.current;
    if (!el) { updateField('content', `${form.content || ''}${snippet}`); return; }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + snippet + el.value.slice(end);
    updateField('content', next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const uploadInlineImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast('Only image files can be inserted.', true);
      return;
    }
    setUploadingImage(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('image', compressed);
      const res = await fetch(IMAGES, { method: 'POST', body: fd });
      if (!res.ok) { toast(await parseError(res), true); return; }
      const { url } = await res.json();
      const alt = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
      insertAtCursor(`\n\n![${alt}](${url})\n\n`);
      setActiveTab('write');
      toast('Image added to your story.');
    } catch {
      toast('Network error — could not upload image.', true);
    } finally {
      setUploadingImage(false);
    }
  };

  const onPickInlineImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) uploadInlineImage(file);
  };

  const onPasteContent = (e) => {
    if (!isEditing) return;
    const items = e.clipboardData?.items || [];
    const imgItem = Array.from(items).find((it) => it.type?.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (file) uploadInlineImage(file);
    }
  };

  const onDropContent = (e) => {
    if (!isEditing) return;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      uploadInlineImage(file);
    }
  };

  const handleDownloadPdf = async () => {
    if (!form.title.trim()) { toast('Add a title before exporting.', true); return; }
    setPdfBusy(true);
    try {
      const categoryName = categories.find((c) => String(c.id) === String(form.category))?.name || null;
      await exportBlogPdf({
        title: form.title,
        author: form.author,
        category: categoryName,
        tags: parseTags(form.tags),
        readTime: Math.max(1, Math.round((form.content || '').split(/\s+/).filter(Boolean).length / 200)),
        status: form.status,
        date: post?.published_at || post?.created_at || new Date().toISOString(),
        coverUrl: coverPreview || (!removeCover && post?.cover_image_url) || null,
        body: form.content,
      });
      toast('PDF downloaded.');
    } catch {
      toast('Could not build the PDF.', true);
    } finally {
      setPdfBusy(false);
    }
  };

  const buildPayload = () => {
    const tags = parseTags(form.tags);
    const base = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      author: form.author,
      status: form.status,
      is_featured: form.isFeatured,
      tags,
      category: form.category ? Number(form.category) : null,
    };

    if (coverFile || removeCover) {
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => {
        if (k === 'tags') fd.append('tags', JSON.stringify(v));
        else if (k === 'category') { if (v !== null) fd.append('category', String(v)); }
        else fd.append(k, String(v));
      });
      if (coverFile) fd.append('cover_image', coverFile);
      if (removeCover && !coverFile) fd.append('remove_cover', 'true');
      return fd;
    }
    return base;
  };

  const savePost = async (overrides = {}) => {
    const title = overrides.title ?? form.title;
    if (!title.trim()) {
      setSaveError('Give your post a title before saving.');
      setActiveTab('write');
      return null;
    }

    setSaving(true);
    setSaveError('');
    try {
      const payload = buildPayload();
      const isNew = mode === 'new';
      const url = isNew ? POSTS : `${POSTS}${activeId}/`;
      const method = isNew ? 'POST' : 'PATCH';

      let res;
      if (payload instanceof FormData) {
        if (overrides.status) payload.set('status', overrides.status);
        if (overrides.title !== undefined) payload.set('title', overrides.title);
        res = await fetch(url, { method, body: payload });
      } else {
        res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, ...overrides }),
        });
      }

      if (!res.ok) {
        setSaveError(await parseError(res));
        return null;
      }

      const saved = await res.json();
      setPost(saved);
      setActiveId(saved.id);
      setForm(postToForm(saved));
      setComments(saved.comments || []);
      setDirty(false);
      clearCover();
      setRemoveCover(false);
      setMode('edit');

      setPosts((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)) : [saved, ...prev];
      });

      toast(isNew ? 'Post created ✓' : 'Post saved ✓');
      fetchStats();
      return saved;
    } catch {
      setSaveError('Network error — changes were not saved.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    const nextStatus = form.status === 'published' ? 'draft' : 'published';
    updateField('status', nextStatus);
    await savePost({ status: nextStatus });
  };

  const deletePost = async (id) => {
    setDeleting(true);
    try {
      const res = await fetch(`${POSTS}${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204 && res.status !== 404) {
        toast('Delete failed. Please try again.', true);
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      fetchStats();
      setConfirmDelete(null);
      if (activeId === id) {
        setMode(null);
        setActiveId(null);
        setPost(null);
      }
      toast('Post deleted');
    } catch {
      toast('Network error — could not delete.', true);
    } finally {
      setDeleting(false);
    }
  };

  const toggleLike = async (item) => {
    const isLiked = liked.has(item.id);
    setLiked((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(item.id); else next.add(item.id);
      return next;
    });
    setPosts((prev) => prev.map((p) => (p.id === item.id ? { ...p, likes: Math.max(0, (p.likes || 0) + (isLiked ? -1 : 1)) } : p)));
    if (post && post.id === item.id) {
      setPost((prev) => ({ ...prev, likes: Math.max(0, (prev.likes || 0) + (isLiked ? -1 : 1)) }));
    }
    try {
      await fetch(`${POSTS}${item.id}/like/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ like: !isLiked }),
      });
    } catch {
      toast('Could not sync like.', true);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim() || !post) return;
    setPostingComment(true);
    try {
      const res = await fetch(COMMENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post: post.id,
          author_name: commentName.trim() || 'Anonymous',
          body: commentBody.trim(),
        }),
      });
      if (!res.ok) { toast(await parseError(res), true); return; }
      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setCommentBody('');
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
      toast('Comment added ✓');
    } catch {
      toast('Network error — comment not saved.', true);
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async (id) => {
    try {
      const res = await fetch(`${COMMENTS}${id}/`, { method: 'DELETE' });
      if (res.ok || res.status === 204 || res.status === 404) {
        setComments((prev) => prev.filter((c) => c.id !== id));
        setPosts((prev) => prev.map((p) => (p.id === post?.id ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p)));
      }
    } catch {
      toast('Could not delete comment.', true);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (mode === 'new' || mode === 'edit') savePost();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('blog-search')?.focus();
      }
      if (e.key === 'Escape' && confirmDelete !== null && !deleting) setConfirmDelete(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, form, coverFile, removeCover, confirmDelete, deleting]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const isEditing = mode === 'new' || mode === 'edit';
  const isLikedForActive = post ? liked.has(post.id) : false;

  return (
    <>
      <GlobalStyle />
      <PageWrap className="blog-scope">
        <TopBar>
          <TopLeft>
            {onBack && <BackBtn type="button" onClick={mode ? backToList : onBack} title={mode ? 'Back to posts' : 'Back'}>{I.back}</BackBtn>}
            <TitleRow>
              <PageTitle>Blog <em>Studio</em></PageTitle>
              <CountBadge>{stats.total}</CountBadge>
            </TitleRow>
          </TopLeft>
          <TopRight>
            <SearchWrap>
              <SearchIcon>{I.search}</SearchIcon>
              <SearchInput
                id="blog-search"
                type="text"
                placeholder="Search posts…  (⌘K)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </SearchWrap>
            <NewBtn type="button" onClick={startNew}>{I.plus} New Post</NewBtn>
          </TopRight>
        </TopBar>

        {mode === null && (
          <>
            <StatsRow>
              <StatCard><StatNum>{stats.published}</StatNum><StatLabel>Published</StatLabel></StatCard>
              <StatCard><StatNum>{stats.drafts}</StatNum><StatLabel>Drafts</StatLabel></StatCard>
              <StatCard><StatNum>{stats.views}</StatNum><StatLabel>Views</StatLabel></StatCard>
              <StatCard><StatNum>{stats.likes}</StatNum><StatLabel>Likes</StatLabel></StatCard>
            </StatsRow>

            <Toolbar>
              <ChipGroup>
                {['all', 'published', 'draft'].map((s) => (
                  <Chip key={s} $active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? 'All' : s === 'published' ? 'Published' : 'Drafts'}
                  </Chip>
                ))}
              </ChipGroup>
              <Spacer />
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort posts">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="popular">Most viewed</option>
                <option value="liked">Most liked</option>
                <option value="title">Title A–Z</option>
              </Select>
            </Toolbar>

            {listError && (
              <ErrorBanner>
                {listError} <RetryBtn onClick={() => fetchPosts(1, false)}>Retry</RetryBtn>
              </ErrorBanner>
            )}

            {loading ? (
              <SkeletonGrid>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </SkeletonGrid>
            ) : posts.length === 0 ? (
              <EmptyState>
                <EmptyIcon>📝</EmptyIcon>
                <EmptyTitle>{total === 0 ? 'No posts yet' : 'No posts match your filters'}</EmptyTitle>
                <EmptyDesc>
                  {total === 0
                    ? 'Write your first story — it only takes a minute.'
                    : 'Try a different search or clear the filters.'}
                </EmptyDesc>
                <NewBtn type="button" onClick={startNew}>{I.plus} Write a post</NewBtn>
              </EmptyState>
            ) : (
              <>
              <PostGrid>
                {posts.map((p, i) => (
                  <PostCard key={p.id} $delay={i * 0.04} onClick={() => openPost(p)}>
                    <CardCover $url={p.cover_image_url} $color={p.category_color || C.green}>
                      {!p.cover_image_url && <CoverLetter>{(p.title || '?').charAt(0).toUpperCase()}</CoverLetter>}
                      <CardBadges>
                        <StatusBadge $status={p.status}>
                          {p.status === 'published' ? '● Published' : '○ Draft'}
                        </StatusBadge>
                        {p.is_featured && <FeaturedBadge>{I.star(true)}</FeaturedBadge>}
                      </CardBadges>
                    </CardCover>
                    <CardBody>
                      {p.category_name && <CardCategory $color={p.category_color || C.green}>{p.category_name}</CardCategory>}
                      <CardTitle>{p.title}</CardTitle>
                      {p.excerpt && <CardExcerpt>{p.excerpt}</CardExcerpt>}
                      {Array.isArray(p.tags) && p.tags.length > 0 && (
                        <TagRow>{p.tags.slice(0, 4).map((t) => <Tag key={t}>#{t}</Tag>)}</TagRow>
                      )}
                      <CardFooter>
                        <CardMeta>{I.clock} {p.read_time || 1} min</CardMeta>
                        <CardMeta>{I.eye} {p.views || 0}</CardMeta>
                        <CardMeta>{I.heart(liked.has(p.id))} {p.likes || 0}</CardMeta>
                        <CardMeta>{I.chat} {p.comment_count || 0}</CardMeta>
                        <CardDate>{p.status === 'published' ? fmtRelative(p.published_at || p.created_at) : fmtDate(p.updated_at)}</CardDate>
                      </CardFooter>
                    </CardBody>
                    <CardActions onClick={(e) => e.stopPropagation()}>
                      <IconBtn title="Edit" onClick={() => openPost(p, true)}>{I.edit}</IconBtn>
                      <IconBtn title="Delete" $danger onClick={() => setConfirmDelete(p)}>{I.trash}</IconBtn>
                    </CardActions>
                  </PostCard>
                ))}
              </PostGrid>
              {posts.length < total && (
                <LoadMoreRow>
                  <LoadMoreBtn type="button" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : `Load more (${posts.length}/${total})`}
                  </LoadMoreBtn>
                </LoadMoreRow>
              )}
              </>
            )}
          </>
        )}

        {mode !== null && (
          <EditorWrap>
            <EditorHeader>
              <EditorHeading>
                <EditorStatus $status={form.status}>
                  {form.status === 'published' ? '● Published' : '○ Draft'}
                </EditorStatus>
                {mode === 'new' ? <EditorTitleLabel>New post</EditorTitleLabel>
                  : <EditorTitleLabel>{post?.slug ? `/${post.slug}` : 'Editing post'}</EditorTitleLabel>}
              </EditorHeading>
              <EditorHeaderActions>
                {activeId && <IconBtn title="Delete post" $danger onClick={() => setConfirmDelete(post || { id: activeId, title: form.title })}>{I.trash}</IconBtn>}
                <GhostBtn type="button" onClick={handleDownloadPdf} disabled={pdfBusy}>
                  {pdfBusy ? <Spinner /> : I.download} {pdfBusy ? 'Preparing…' : 'PDF'}
                </GhostBtn>
                <GhostBtn type="button" onClick={backToList}>Close</GhostBtn>
                {mode === 'view' ? (
                  <PrimaryBtn type="button" onClick={() => setMode('edit')}>{I.edit} Edit</PrimaryBtn>
                ) : (
                  <PrimaryBtn type="button" onClick={() => savePost()} disabled={saving}>
                    {saving && <Spinner />}
                    {saving ? 'Saving…' : 'Save'}
                  </PrimaryBtn>
                )}
              </EditorHeaderActions>
            </EditorHeader>

            {saveError && <ErrorBanner>⚠ {saveError}</ErrorBanner>}

            <EditorGrid>
              <EditorMain>
                <CoverDrop
                  $hasImage={!!coverPreview || (!removeCover && !!post?.cover_image_url)}
                  onClick={() => isEditing && fileInputRef.current?.click()}
                  $readonly={!isEditing}
                >
                  {(coverPreview || (!removeCover && post?.cover_image_url)) ? (
                    <CoverImg src={coverPreview || post.cover_image_url} alt="Cover" />
                  ) : (
                    <CoverPlaceholder>
                      {I.image}
                      <span>{isEditing ? 'Add a cover image' : 'No cover image'}</span>
                    </CoverPlaceholder>
                  )}
                  {isEditing && (
                    <CoverOverlay>
                      <SmallBtn type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        {coverPreview || post?.cover_image_url ? 'Change' : 'Upload'}
                      </SmallBtn>
                      {(coverPreview || post?.cover_image_url) && (
                        <SmallBtn type="button" $danger onClick={(e) => { e.stopPropagation(); handleRemoveCover(); }}>Remove</SmallBtn>
                      )}
                    </CoverOverlay>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickCover} />
                </CoverDrop>

                <TitleInput
                  value={form.title}
                  placeholder="Post title…"
                  readOnly={!isEditing}
                  onChange={(e) => updateField('title', e.target.value)}
                />

                <MetaGrid>
                  <Field>
                    <FieldLabel>Author</FieldLabel>
                    <Input value={form.author} readOnly={!isEditing} onChange={(e) => updateField('author', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Category</FieldLabel>
                    <Input as="select" value={form.category} disabled={!isEditing} onChange={(e) => updateField('category', e.target.value)}>
                      <option value="">Uncategorised</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Input>
                  </Field>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Input as="select" value={form.status} disabled={!isEditing} onChange={(e) => updateField('status', e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </Input>
                  </Field>
                  <Field>
                    <FieldLabel>Tags</FieldLabel>
                    <Input
                      value={form.tags}
                      placeholder="react, django, design"
                      readOnly={!isEditing}
                      onChange={(e) => updateField('tags', e.target.value)}
                    />
                  </Field>
                </MetaGrid>

                <Field>
                  <FieldLabel>Excerpt / summary</FieldLabel>
                  <Textarea
                    rows={2}
                    value={form.excerpt}
                    placeholder="A short teaser shown on the post card…"
                    readOnly={!isEditing}
                    onChange={(e) => updateField('excerpt', e.target.value)}
                  />
                </Field>

                <ContentHeader>
                  <TabBtn $active={activeTab === 'write'} onClick={() => setActiveTab('write')}>Write</TabBtn>
                  <TabBtn $active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>Preview</TabBtn>
                  <Spacer />
                  <MetaInline>{I.clock} {Math.max(1, Math.round((form.content || '').split(/\s+/).filter(Boolean).length / 200))} min read · {(form.content || '').split(/\s+/).filter(Boolean).length} words</MetaInline>
                </ContentHeader>

                {activeTab === 'write' && isEditing && (
                  <MdToolbar>
                    <MdToolBtn type="button" title="Bold" onClick={() => wrapSelection('**', '**')}>B</MdToolBtn>
                    <MdToolBtn type="button" title="Italic" onClick={() => wrapSelection('*', '*')}><em>I</em></MdToolBtn>
                    <MdToolBtn type="button" title="Heading" onClick={() => insertAtCursor('\n## ')}>H</MdToolBtn>
                    <MdToolBtn type="button" title="Bullet list" onClick={() => insertAtCursor('\n- ')}>•</MdToolBtn>
                    <MdToolBtn type="button" title="Quote" onClick={() => insertAtCursor('\n> ')}>❝</MdToolBtn>
                    <MdToolBtn type="button" title="Inline code" onClick={() => wrapSelection('`', '`')}>{'</>'}</MdToolBtn>
                    <MdToolBtn type="button" title="Link" onClick={() => insertAtCursor('[text](https://)')}>🔗</MdToolBtn>
                    <Spacer />
                    <MdToolBtn type="button" $accent onClick={() => inlineInputRef.current?.click()} disabled={uploadingImage}>
                      {I.image} {uploadingImage ? 'Uploading…' : 'Insert image'}
                    </MdToolBtn>
                    <input ref={inlineInputRef} type="file" accept="image/*" hidden onChange={onPickInlineImage} />
                  </MdToolbar>
                )}

                {activeTab === 'write' ? (
                  <ContentArea
                    ref={contentRef}
                    value={form.content}
                    placeholder="Write your story in markdown…\n\n# Heading\n**bold**, *italic*, `code`, [links](https://…), lists and > quotes\n\nTip: paste or drop an image to insert it inline."
                    readOnly={!isEditing}
                    onChange={(e) => updateField('content', e.target.value)}
                    onPaste={onPasteContent}
                    onDrop={onDropContent}
                  />
                ) : (
                  <PreviewPane><Markdown text={form.content} /></PreviewPane>
                )}
              </EditorMain>

              <EditorSide>
                {isEditing && (
                  <SideCard>
                    <SideTitle>Publish</SideTitle>
                    <PublishRow>
                      <PrimaryBtn type="button" onClick={() => savePost()} disabled={saving}>
                        {saving && <Spinner />}{saving ? 'Saving…' : 'Save changes'}
                      </PrimaryBtn>
                      <GhostBtn type="button" onClick={togglePublish} disabled={saving}>
                        {form.status === 'published' ? 'Unpublish' : 'Publish'}
                      </GhostBtn>
                    </PublishRow>
                    <FeatureToggle $active={form.isFeatured} onClick={() => updateField('isFeatured', !form.isFeatured)}>
                      {I.star(form.isFeatured)}
                      <span>{form.isFeatured ? 'Featured post' : 'Mark as featured'}</span>
                    </FeatureToggle>
                    <Hint>Tip: ⌘/Ctrl + S to save.</Hint>
                  </SideCard>
                )}

                {post && (
                  <SideCard>
                    <SideTitle>Post stats</SideTitle>
                    <StatLine><span>Status</span><b>{post.status_display || post.status}</b></StatLine>
                    <StatLine><span>Published</span><b>{post.published_at ? fmtDate(post.published_at) : '—'}</b></StatLine>
                    <StatLine><span>Reading time</span><b>{post.read_time || 1} min</b></StatLine>
                    <StatLine><span>Views</span><b>{post.views || 0}</b></StatLine>
                    <StatLine><span>Likes</span><b>{post.likes || 0}</b></StatLine>
                    <StatLine><span>Comments</span><b>{comments.length}</b></StatLine>
                    <LikeBtn type="button" $active={isLikedForActive} onClick={() => toggleLike(post)}>
                      {I.heart(isLikedForActive)} {isLikedForActive ? 'Liked' : 'Like this post'}
                    </LikeBtn>
                    {post.slug && <SlugLine>/{post.slug}</SlugLine>}
                  </SideCard>
                )}

                {post && (
                  <SideCard>
                    <SideTitle>Comments <CommentCount>{comments.length}</CommentCount></SideTitle>
                    <CommentList>
                      {comments.length === 0 && <EmptyComments>No comments yet.</EmptyComments>}
                      {comments.map((c) => (
                        <CommentItem key={c.id}>
                          <CommentTop>
                            <CommentAuthor>{c.author_name}</CommentAuthor>
                            <CommentTime>{fmtRelative(c.created_at)}</CommentTime>
                            <CommentDelete title="Delete" onClick={() => deleteComment(c.id)}>{I.trash}</CommentDelete>
                          </CommentTop>
                          <CommentBody>{c.body}</CommentBody>
                        </CommentItem>
                      ))}
                    </CommentList>
                    <CommentForm onSubmit={addComment}>
                      <Input
                        value={commentName}
                        placeholder="Your name (optional)"
                        onChange={(e) => setCommentName(e.target.value)}
                      />
                      <Textarea
                        rows={2}
                        value={commentBody}
                        placeholder="Add a comment…"
                        onChange={(e) => setCommentBody(e.target.value)}
                      />
                      <PrimaryBtn type="submit" disabled={postingComment || !commentBody.trim()}>
                        {postingComment ? <Spinner /> : I.send} {postingComment ? 'Posting…' : 'Comment'}
                      </PrimaryBtn>
                    </CommentForm>
                  </SideCard>
                )}
              </EditorSide>
            </EditorGrid>
          </EditorWrap>
        )}
      </PageWrap>

      {confirmDelete && (
        <ModalOverlay onClick={() => { if (!deleting) setConfirmDelete(null); }}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Delete this post?</ModalTitle>
            <ModalDesc>
              “{confirmDelete.title || 'Untitled'}” will be permanently removed along with its comments. This can't be undone.
            </ModalDesc>
            <ModalActions>
              <GhostBtn type="button" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</GhostBtn>
              <DangerBtn type="button" onClick={() => deletePost(confirmDelete.id)} disabled={deleting}>
                {deleting && <Spinner />}{deleting ? 'Deleting…' : 'Delete'}
              </DangerBtn>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      <ToastWrap>
        {toasts.map((t) => <ToastBox key={t.id} $err={t.err}>{t.err ? '✗' : '✓'} {t.msg}</ToastBox>)}
      </ToastWrap>
    </>
  );
}

const PageWrap = styled.div`
  min-height: 100vh;
  background: ${C.bg};
  color: ${C.dark};
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  padding-bottom: 4rem;
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: .9rem 2rem;
  background: rgba(246,245,240,.92);
  backdrop-filter: blur(8px);
  border-bottom: 1.5px solid ${C.border};
`;

const TopLeft = styled.div`display:flex; align-items:center; gap:.85rem; min-width:0;`;
const TopRight = styled.div`display:flex; align-items:center; gap:.7rem; flex-wrap:wrap;`;

const BackBtn = styled.button`
  display:flex; align-items:center; justify-content:center;
  width: 34px; height: 34px; flex-shrink: 0;
  border-radius: 10px; cursor: pointer;
  background: ${C.white}; color: ${C.dark};
  border: 1.5px solid ${C.border};
  transition: all .18s ease;
  &:hover { background: ${C.dark}; color: ${C.bg}; border-color: ${C.dark}; }
`;

const TitleRow = styled.div`display:flex; align-items:center; gap:.6rem; min-width:0;`;
const PageTitle = styled.h1`
  font-size: 1.35rem; font-weight: 800; letter-spacing: -.03em; margin: 0;
  white-space: nowrap;
  em { font-style: normal; color: ${C.green}; }
`;
const CountBadge = styled.span`
  font-size: .68rem; font-weight: 700;
  background: ${C.muted}; border: 1.5px solid ${C.border}; color: ${C.soft};
  padding: .12rem .55rem; border-radius: 100px;
`;

const SearchWrap = styled.div`position: relative; display:flex; align-items:center;`;
const SearchIcon = styled.span`
  position:absolute; left:.7rem; color:${C.soft}; display:flex; pointer-events:none;
`;
const SearchInput = styled.input`
  width: 220px;
  padding: .5rem .8rem .5rem 2.1rem;
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 100px;
  font-size: .85rem; font-family: inherit;
  outline: none;
  transition: all .18s ease;
  &::placeholder { color: ${C.soft}; }
  &:focus { border-color: ${C.green}; box-shadow: 0 0 0 3px ${C.greenLt}; }
  @media (max-width: 620px) { width: 100%; }
`;

const NewBtn = styled.button`
  display:inline-flex; align-items:center; gap:.4rem;
  font-family: inherit; font-size: .82rem; font-weight: 700;
  background: ${C.green}; color: #fff;
  border: 1.5px solid ${C.green};
  padding: .5rem .95rem; border-radius: 100px;
  cursor: pointer; transition: all .18s ease; white-space: nowrap;
  &:hover { background: ${C.dark}; border-color: ${C.dark}; }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: .85rem;
  padding: 1.5rem 2rem .5rem;
  max-width: 1280px; margin: 0 auto;
`;
const StatCard = styled.div`
  background: ${C.white}; border: 1.5px solid ${C.border}; border-radius: 14px;
  padding: .9rem 1rem; display:flex; flex-direction:column; gap:.1rem;
  animation: ${fadeUp} .4s ease both;
`;
const StatNum = styled.span`font-size:1.4rem; font-weight:800; color:${C.green}; line-height:1.1;`;
const StatLabel = styled.span`font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${C.soft};`;

const Toolbar = styled.div`
  display:flex; align-items:center; gap:.6rem; flex-wrap:wrap;
  padding: 1rem 2rem;
  max-width: 1280px; margin: 0 auto;
`;
const ChipGroup = styled.div`display:flex; gap:.4rem; flex-wrap:wrap;`;
const Chip = styled.button`
  font-family: inherit; font-size:.78rem; font-weight:700;
  padding: .34rem .85rem; border-radius:100px; cursor:pointer;
  border: 1.5px solid ${p => (p.$active ? C.green : C.border)};
  background: ${p => (p.$active ? C.green : C.white)};
  color: ${p => (p.$active ? '#fff' : C.soft)};
  transition: all .16s ease;
  &:hover { border-color: ${C.green}; color: ${p => (p.$active ? '#fff' : C.dark)}; }
`;
const Spacer = styled.div`flex:1;`;
const Select = styled.select`
  font-family: inherit; font-size:.8rem; font-weight:600;
  padding: .42rem .7rem; border-radius:10px;
  border: 1.5px solid ${C.border}; background:${C.white}; color:${C.dark};
  cursor:pointer; outline:none;
  &:focus { border-color:${C.green}; }
`;

const ErrorBanner = styled.div`
  max-width: 1280px; margin: 0 auto 1rem; padding: .7rem 1rem;
  background: ${C.dangerLt}; border: 1.5px solid #f0b4ad; color: ${C.danger};
  border-radius: 12px; font-size: .85rem;
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
`;
const RetryBtn = styled.button`
  font-family:inherit; font-weight:700; font-size:.78rem;
  background:${C.danger}; color:#fff; border:none; border-radius:8px;
  padding:.3rem .7rem; cursor:pointer;
`;

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.1rem;
  max-width: 1280px; margin: 0 auto; padding: .5rem 2rem 2rem;
`;
const LoadMoreRow = styled.div`
  display: flex; justify-content: center;
  max-width: 1280px; margin: 0 auto; padding: 0 2rem 4rem;
`;
const LoadMoreBtn = styled.button`
  font-family: 'Syne', sans-serif; font-size: .8rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  color: ${C.green}; background: ${C.white};
  border: 1.5px solid ${C.green}; padding: .6rem 1.4rem;
  border-radius: 100px; cursor: pointer; transition: all .18s ease;
  &:hover:not(:disabled) { background: ${C.green}; color: ${C.white}; }
  &:disabled { opacity: .6; cursor: default; }
`;

const PostCard = styled.article`
  position: relative;
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  display: flex; flex-direction: column;
  animation: ${fadeUp} .45s ease both;
  animation-delay: ${p => p.$delay}s;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  &:hover { transform: translateY(-4px); box-shadow: 0 14px 36px rgba(26,26,46,.1); border-color: ${C.green}; }
`;

const CardCover = styled.div`
  position: relative;
  height: 150px;
  background: ${p => (p.$url ? `url(${p.$url}) center/cover no-repeat` : `linear-gradient(135deg, ${p.$color}, ${C.dark})`)};
  display:flex; align-items:center; justify-content:center;
`;
const CoverLetter = styled.span`
  font-size: 2.6rem; font-weight: 800; color: rgba(255,255,255,.9);
`;
const CardBadges = styled.div`
  position:absolute; top:.6rem; left:.6rem; right:.6rem;
  display:flex; align-items:center; justify-content:space-between; gap:.4rem;
`;
const StatusBadge = styled.span`
  font-size:.62rem; font-weight:800; text-transform:uppercase; letter-spacing:.6px;
  padding:.18rem .55rem; border-radius:100px;
  background: ${p => (p.$status === 'published' ? 'rgba(45,106,79,.92)' : 'rgba(26,26,46,.78)')};
  color:#fff;
`;
const FeaturedBadge = styled.span`
  display:flex; align-items:center; justify-content:center;
  width:24px; height:24px; border-radius:50%;
  background:${C.gold}; color:#fff;
`;

const CardBody = styled.div`padding:1rem 1.1rem 1.1rem; display:flex; flex-direction:column; gap:.45rem; flex:1;`;
const CardCategory = styled.span`
  align-self:flex-start;
  font-size:.62rem; font-weight:800; text-transform:uppercase; letter-spacing:.6px;
  color: ${p => p.$color}; background:${p => p.$color}1a;
  border:1px solid ${p => p.$color}40;
  padding:.15rem .5rem; border-radius:100px;
`;
const CardTitle = styled.h3`
  font-size:1rem; font-weight:800; letter-spacing:-.02em; line-height:1.3; margin:0;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
`;
const CardExcerpt = styled.p`
  font-size:.82rem; color:${C.soft}; line-height:1.55; margin:0;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
`;
const TagRow = styled.div`display:flex; flex-wrap:wrap; gap:.3rem; margin-top:.1rem;`;
const Tag = styled.span`
  font-size:.68rem; font-weight:600; color:${C.green};
  background:${C.greenLt}; border-radius:6px; padding:.1rem .4rem;
`;
const CardFooter = styled.div`
  display:flex; align-items:center; gap:.7rem; flex-wrap:wrap;
  margin-top:auto; padding-top:.55rem; border-top:1px solid ${C.muted};
`;
const CardMeta = styled.span`
  display:inline-flex; align-items:center; gap:.25rem;
  font-size:.7rem; font-weight:600; color:${C.soft};
`;
const CardDate = styled.span`margin-left:auto; font-size:.68rem; color:${C.soft};`;

const CardActions = styled.div`
  position:absolute; top:.55rem; right:.55rem;
  display:flex; gap:.35rem;
  opacity:0; transition:opacity .18s ease;
  ${PostCard}:hover & { opacity:1; }
  @media (hover: none) { opacity:1; }
`;
const IconBtn = styled.button`
  display:flex; align-items:center; justify-content:center;
  width:30px; height:30px; border-radius:9px; cursor:pointer;
  background:${C.white}; color:${p => (p.$danger ? C.danger : C.dark)};
  border:1.5px solid ${C.border};
  transition:all .16s ease;
  &:hover { background:${p => (p.$danger ? C.danger : C.dark)}; color:#fff; border-color:${p => (p.$danger ? C.danger : C.dark)}; }
`;

const SkeletonGrid = styled(PostGrid)`padding-top:.5rem;`;
const SkeletonCard = styled.div`
  height: 290px; border-radius: 16px;
  background: linear-gradient(90deg, #eceae3 25%, #f4f2ec 50%, #eceae3 75%);
  background-size: 500px 100%;
  animation: ${shimmer} 1.3s infinite linear;
`;

const EmptyState = styled.div`
  max-width: 1280px; margin: 2rem auto; padding: 4rem 2rem;
  display:flex; flex-direction:column; align-items:center; gap:.6rem; text-align:center;
`;
const EmptyIcon = styled.div`font-size:2.6rem;`;
const EmptyTitle = styled.h3`font-size:1.05rem; font-weight:800; margin:0;`;
const EmptyDesc = styled.p`font-size:.86rem; color:${C.soft}; margin:0 0 .8rem; max-width:360px;`;

const EditorWrap = styled.section`
  max-width: 1280px; margin: 0 auto; padding: 1.25rem 2rem 3rem;
  animation: ${fadeUp} .35s ease both;
`;
const EditorHeader = styled.div`
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
  flex-wrap:wrap; margin-bottom:1.1rem;
`;
const EditorHeading = styled.div`display:flex; align-items:center; gap:.7rem; min-width:0;`;
const EditorStatus = styled.span`
  font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.6px;
  padding:.2rem .6rem; border-radius:100px; color:#fff;
  background:${p => (p.$status === 'published' ? C.green : C.dark)};
`;
const EditorTitleLabel = styled.span`
  font-size:.85rem; font-weight:600; color:${C.soft};
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:52vw;
`;
const EditorHeaderActions = styled.div`display:flex; align-items:center; gap:.5rem;`;

const EditorGrid = styled.div`
  display:grid; grid-template-columns: minmax(0,1fr) 320px; gap:1.25rem;
  align-items:start;
  @media (max-width: 960px) { grid-template-columns: 1fr; }
`;
const EditorMain = styled.div`
  background:${C.white}; border:1.5px solid ${C.border}; border-radius:16px;
  padding:1.25rem; display:flex; flex-direction:column; gap:1rem;
`;
const EditorSide = styled.aside`display:flex; flex-direction:column; gap:1rem;`;

const CoverDrop = styled.div`
  position:relative; height:${p => (p.$hasImage ? '240px' : '140px')};
  border:1.5px dashed ${C.border}; border-radius:12px; overflow:hidden;
  background:${C.muted};
  display:flex; align-items:center; justify-content:center;
  cursor:${p => (p.$readonly ? 'default' : 'pointer')};
  transition:border-color .18s ease;
  &:hover { border-color:${p => (p.$readonly ? C.border : C.green)}; }
`;
const CoverImg = styled.img`width:100%; height:100%; object-fit:cover; display:block;`;
const CoverPlaceholder = styled.div`
  display:flex; flex-direction:column; align-items:center; gap:.4rem;
  color:${C.soft}; font-size:.82rem; font-weight:600;
`;
const CoverOverlay = styled.div`
  position:absolute; right:.6rem; bottom:.6rem; display:flex; gap:.4rem;
`;
const SmallBtn = styled.button`
  font-family:inherit; font-size:.74rem; font-weight:700;
  padding:.32rem .7rem; border-radius:8px; cursor:pointer;
  border:1.5px solid ${C.border};
  background:${C.white}; color:${p => (p.$danger ? C.danger : C.dark)};
  transition:all .16s ease;
  &:hover { background:${p => (p.$danger ? C.danger : C.dark)}; color:#fff; border-color:${p => (p.$danger ? C.danger : C.dark)}; }
`;

const TitleInput = styled.input`
  width:100%; font-family:inherit; font-size:1.5rem; font-weight:800; letter-spacing:-.03em;
  color:${C.dark}; background:transparent; border:none; outline:none; padding:.1rem 0;
  border-bottom:1.5px solid ${C.border};
  &::placeholder { color:#bdb8ad; }
  &:focus { border-color:${C.green}; }
`;

const MetaGrid = styled.div`
  display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:.85rem;
`;
const Field = styled.div`display:flex; flex-direction:column; gap:.3rem; min-width:0;`;
const FieldLabel = styled.label`
  font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:${C.soft};
`;
const Input = styled.input`
  width:100%; font-family:inherit; font-size:.88rem; color:${C.dark};
  padding:.55rem .7rem; border-radius:10px;
  border:1.5px solid ${C.border}; background:${C.white}; outline:none;
  transition:border-color .16s ease, box-shadow .16s ease;
  &::placeholder { color:#bdb8ad; }
  &:focus { border-color:${C.green}; box-shadow:0 0 0 3px ${C.greenLt}; }
  &:disabled, &:read-only { background:${C.muted}; }
`;
const Textarea = styled.textarea`
  width:100%; font-family:inherit; font-size:.88rem; color:${C.dark}; line-height:1.55;
  padding:.6rem .75rem; border-radius:10px; resize:vertical;
  border:1.5px solid ${C.border}; background:${C.white}; outline:none;
  transition:border-color .16s ease, box-shadow .16s ease;
  &::placeholder { color:#bdb8ad; }
  &:focus { border-color:${C.green}; box-shadow:0 0 0 3px ${C.greenLt}; }
  &:read-only { background:${C.muted}; }
`;

const ContentHeader = styled.div`display:flex; align-items:center; gap:.4rem;`;
const TabBtn = styled.button`
  font-family:inherit; font-size:.8rem; font-weight:700;
  padding:.35rem .85rem; border-radius:100px; cursor:pointer;
  border:1.5px solid ${p => (p.$active ? C.green : C.border)};
  background:${p => (p.$active ? C.green : C.white)};
  color:${p => (p.$active ? '#fff' : C.soft)};
  transition:all .16s ease;
`;
const MetaInline = styled.span`
  display:inline-flex; align-items:center; gap:.3rem;
  font-size:.72rem; font-weight:600; color:${C.soft};
`;
const MdToolbar = styled.div`
  display:flex; align-items:center; gap:.35rem; flex-wrap:wrap;
  padding:.4rem .5rem; margin-bottom:.55rem; border-radius:10px;
  border:1.5px solid ${C.border}; background:${C.muted};
`;
const MdToolBtn = styled.button`
  display:inline-flex; align-items:center; gap:.35rem;
  font-family:inherit; font-size:.76rem; font-weight:800; line-height:1;
  padding:.4rem .58rem; border-radius:8px; cursor:pointer;
  border:1.5px solid ${p => (p.$accent ? C.green : 'transparent')};
  background:${p => (p.$accent ? C.green : C.white)};
  color:${p => (p.$accent ? '#fff' : C.dark)};
  transition:all .15s ease;
  &:hover:not(:disabled) { transform:translateY(-1px); border-color:${C.green}; }
  &:disabled { opacity:.6; cursor:default; }
`;
const ContentArea = styled.textarea`
  width:100%; min-height:420px; font-family:'SF Mono', ui-monospace, Menlo, monospace;
  font-size:.9rem; line-height:1.7; color:${C.dark};
  padding:1rem; border-radius:12px; resize:vertical;
  border:1.5px solid ${C.border}; background:${C.white}; outline:none;
  &::placeholder { color:#bdb8ad; }
  &:focus { border-color:${C.green}; box-shadow:0 0 0 3px ${C.greenLt}; }
  &:read-only { background:${C.muted}; }
`;
const PreviewPane = styled.div`
  min-height:420px; padding:1.25rem 1.4rem; border-radius:12px;
  border:1.5px solid ${C.border}; background:${C.white};
`;
const MdEmpty = styled.p`color:${C.soft}; font-style:italic;`;
const MdBody = styled.div`
  font-size:.95rem; line-height:1.75; color:${C.dark}; overflow-wrap:anywhere;
  h1,h2,h3,h4,h5,h6 { font-weight:800; letter-spacing:-.02em; margin:1.3rem 0 .6rem; line-height:1.25; }
  h1 { font-size:1.7rem; } h2 { font-size:1.4rem; } h3 { font-size:1.15rem; }
  p { margin:.7rem 0; }
  ul,ol { margin:.7rem 0; padding-left:1.4rem; }
  li { margin:.25rem 0; }
  a { color:${C.green}; text-decoration:underline; }
  strong { font-weight:800; }
  code { background:${C.muted}; border-radius:5px; padding:.1rem .35rem; font-size:.85em; font-family:'SF Mono', ui-monospace, monospace; }
  pre { background:${C.dark}; color:#e8e8ef; border-radius:10px; padding:.9rem 1rem; overflow-x:auto; margin:.9rem 0; }
  pre code { background:transparent; color:inherit; padding:0; }
  blockquote { border-left:3px solid ${C.green}; background:${C.greenLt}; margin:.9rem 0; padding:.6rem .9rem; border-radius:0 8px 8px 0; color:${C.soft}; }
  img { display:block; max-width:100%; border-radius:14px; margin:1.1rem auto;
        box-shadow:0 12px 30px rgba(26,26,46,.16); border:1px solid ${C.border};
        transition:transform .2s ease, box-shadow .2s ease; }
  img:hover { transform:translateY(-2px) scale(1.005); box-shadow:0 18px 40px rgba(26,26,46,.22); }
  hr { border:none; border-top:1.5px solid ${C.border}; margin:1.4rem 0; }
`;

const SideCard = styled.div`
  background:${C.white}; border:1.5px solid ${C.border}; border-radius:16px;
  padding:1.1rem; display:flex; flex-direction:column; gap:.6rem;
`;
const SideTitle = styled.h3`
  font-size:.78rem; font-weight:800; text-transform:uppercase; letter-spacing:1px;
  color:${C.soft}; margin:0; display:flex; align-items:center; gap:.5rem;
`;
const CommentCount = styled.span`
  font-size:.68rem; background:${C.muted}; border:1.5px solid ${C.border};
  color:${C.soft}; border-radius:100px; padding:.05rem .45rem;
`;
const PublishRow = styled.div`display:flex; gap:.5rem;`;
const PrimaryBtn = styled.button`
  display:inline-flex; align-items:center; justify-content:center; gap:.4rem;
  font-family:inherit; font-size:.82rem; font-weight:700;
  background:${C.green}; color:#fff; border:1.5px solid ${C.green};
  padding:.55rem 1rem; border-radius:10px; cursor:pointer;
  transition:all .16s ease;
  &:hover:not(:disabled) { background:${C.dark}; border-color:${C.dark}; }
  &:disabled { opacity:.6; cursor:not-allowed; }
`;
const GhostBtn = styled.button`
  display:inline-flex; align-items:center; justify-content:center; gap:.4rem;
  font-family:inherit; font-size:.82rem; font-weight:700;
  background:${C.white}; color:${C.dark}; border:1.5px solid ${C.border};
  padding:.55rem 1rem; border-radius:10px; cursor:pointer;
  transition:all .16s ease;
  &:hover:not(:disabled) { border-color:${C.dark}; }
  &:disabled { opacity:.6; cursor:not-allowed; }
`;
const DangerBtn = styled(PrimaryBtn)`background:${C.danger}; border-color:${C.danger}; &:hover:not(:disabled){background:#a5311f;border-color:#a5311f;}`;
const FeatureToggle = styled.button`
  display:flex; align-items:center; gap:.5rem;
  font-family:inherit; font-size:.82rem; font-weight:700;
  padding:.5rem .75rem; border-radius:10px; cursor:pointer;
  border:1.5px solid ${p => (p.$active ? C.gold : C.border)};
  background:${p => (p.$active ? '#fff8e1' : C.white)};
  color:${p => (p.$active ? '#a07d13' : C.soft)};
  transition:all .16s ease;
  &:hover { border-color:${C.gold}; }
`;
const Hint = styled.p`font-size:.72rem; color:${C.soft}; margin:0;`;
const StatLine = styled.div`
  display:flex; align-items:center; justify-content:space-between;
  font-size:.8rem; color:${C.soft};
  b { color:${C.dark}; font-weight:700; }
`;
const LikeBtn = styled.button`
  display:flex; align-items:center; justify-content:center; gap:.4rem;
  margin-top:.3rem; font-family:inherit; font-size:.82rem; font-weight:700;
  padding:.55rem; border-radius:10px; cursor:pointer;
  border:1.5px solid ${p => (p.$active ? C.danger : C.border)};
  background:${p => (p.$active ? C.dangerLt : C.white)};
  color:${p => (p.$active ? C.danger : C.soft)};
  transition:all .16s ease;
  &:hover { border-color:${C.danger}; color:${C.danger}; }
`;
const SlugLine = styled.code`
  font-size:.72rem; color:${C.soft}; background:${C.muted};
  border-radius:6px; padding:.25rem .5rem; overflow-wrap:anywhere;
`;

const CommentList = styled.div`display:flex; flex-direction:column; gap:.6rem; max-height:260px; overflow-y:auto;`;
const EmptyComments = styled.p`font-size:.8rem; color:${C.soft}; margin:0;`;
const CommentItem = styled.div`
  background:${C.muted}; border-radius:10px; padding:.6rem .7rem;
`;
const CommentTop = styled.div`display:flex; align-items:center; gap:.5rem; margin-bottom:.2rem;`;
const CommentAuthor = styled.span`font-size:.8rem; font-weight:800;`;
const CommentTime = styled.span`font-size:.68rem; color:${C.soft};`;
const CommentDelete = styled.button`
  margin-left:auto; display:flex; background:none; border:none; cursor:pointer;
  color:${C.soft}; padding:.15rem; border-radius:6px;
  &:hover { color:${C.danger}; background:${C.dangerLt}; }
`;
const CommentBody = styled.p`font-size:.82rem; line-height:1.5; margin:0; overflow-wrap:anywhere;`;
const CommentForm = styled.form`display:flex; flex-direction:column; gap:.5rem; margin-top:.3rem;`;

const ModalOverlay = styled.div`
  position:fixed; inset:0; z-index:900;
  background:rgba(26,26,46,.42);
  display:flex; align-items:center; justify-content:center; padding:1.5rem;
  animation:${pop} .16s ease;
`;
const ModalBox = styled.div`
  background:${C.white}; border-radius:16px; padding:1.5rem;
  width:min(420px, 100%); box-shadow:0 24px 60px rgba(26,26,46,.25);
`;
const ModalTitle = styled.h3`font-size:1.1rem; font-weight:800; margin:0 0 .5rem;`;
const ModalDesc = styled.p`font-size:.86rem; color:${C.soft}; line-height:1.55; margin:0 0 1.3rem; overflow-wrap:anywhere;`;
const ModalActions = styled.div`display:flex; justify-content:flex-end; gap:.6rem;`;

const ToastWrap = styled.div`
  position:fixed; bottom:1.5rem; right:1.5rem; z-index:950;
  display:flex; flex-direction:column; gap:.5rem;
`;
const ToastBox = styled.div`
  display:flex; align-items:center; gap:.5rem;
  background:${C.white}; border:1.5px solid ${C.border};
  border-left:4px solid ${p => (p.$err ? C.danger : C.green)};
  border-radius:12px; padding:.65rem .9rem; font-size:.83rem;
  box-shadow:0 12px 30px rgba(26,26,46,.16);
  animation:${fadeUp} .2s ease; max-width:320px;
`;

const Spinner = styled.span`
  display:inline-block; width:13px; height:13px;
  border:2px solid rgba(255,255,255,.45); border-top-color:#fff;
  border-radius:50%; animation:${spin} .65s linear infinite;
`;
