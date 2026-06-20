import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, createGlobalStyle, css} from 'styled-components';
const API_BASE = import.meta.env.VITE_API_URL;

const ENDPOINT = `${API_BASE}/api/music-vibes/`;

const C = {
  bg:         '#0d0d0f',
  surface:    '#141416',
  surfaceUp:  '#1c1c1f',
  border:     '#2a2a2e',
  borderHov:  '#3f3f46',
  accent:     '#10b981',
  accentDim:  '#0d9268',
  accentGlow: 'rgba(16,185,129,0.15)',
  accentText: '#6ee7b7',
  white:      '#f4f4f5',
  muted:      '#71717a',
  dimmer:     '#52525b',
  danger:     '#ef4444',
  dangerDim:  'rgba(239,68,68,0.12)',
};

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${C.bg};
    font-family: 'DM Sans', sans-serif;
    color: ${C.white};
    -webkit-font-smoothing: antialiased;
  }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
`;

const spin = keyframes`to { transform: rotate(360deg); }`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`;

const toastAnim = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0   rgba(16,185,129,0.3); }
  50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0);   }
`;

const barBounce = keyframes`
  0%, 100% { transform: scaleY(0.4); }
  50%       { transform: scaleY(1.0); }
`;

const Page = styled.div`
  min-height: 100vh;
  padding: 3.5rem 3rem 6rem;
  max-width: 1320px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 2rem 1.25rem 4rem; }
`;

const EyebrowRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.6rem;
`;

const Eyebrow = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3.5px;
  color: ${C.accent};
`;

const EyebrowLine = styled.div`
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, ${C.border}, transparent);
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 640px) { flex-direction: column; gap: 1.2rem; }
`;

const HeadingBlock = styled.div``;

const PageTitle = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  color: ${C.white};
  letter-spacing: -0.04em;
  line-height: 1.1;
  margin-bottom: 0.6rem;

  em { font-style: normal; color: ${C.accent}; }
`;

const PageDesc = styled.p`
  font-size: 0.95rem;
  color: ${C.muted};
  line-height: 1.7;
  max-width: 500px;
`;

const AddButton = styled.button`
  font-family: 'Syne', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  border: 1.5px solid ${p => p.$open ? C.border : C.accent};
  background: ${p => p.$open ? C.surfaceUp : C.accent};
  color: ${p => p.$open ? C.muted : '#000'};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${p => !p.$open && css`animation: ${pulse} 2.5s ease infinite;`}

  &:hover {
    background: ${p => p.$open ? C.border : C.accentDim};
    border-color: ${p => p.$open ? C.borderHov : C.accentDim};
    color: ${p => p.$open ? C.white : '#000'};
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
`;

const Btn = styled.button`
  font-family: 'Syne', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1.5px solid ${p => p.$primary ? C.accent : C.border};
  background: ${p => p.$primary ? C.accent : 'transparent'};
  color: ${p => p.$primary ? '#000' : C.muted};
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    background: ${p => p.$primary ? C.accentDim : C.surfaceUp};
    border-color: ${p => p.$primary ? C.accentDim : C.borderHov};
    color: ${p => p.$primary ? '#000' : C.white};
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;


const IconBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1.5px solid ${p => p.$danger ? 'rgba(239,68,68,0.3)' : C.border};
  background: ${p => p.$danger ? C.dangerDim : C.surfaceUp};
  color: ${p => p.$danger ? C.danger : C.dimmer};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.72rem;
  transition: all 0.15s ease;

  &:hover {
    background: ${p => p.$danger ? C.danger : C.borderHov};
    border-color: ${p => p.$danger ? C.danger : C.borderHov};
    color: ${C.white};
    transform: scale(1.08);
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
`;

const FormPanel = styled.div`
  background: ${C.surface};
  border: 1.5px solid ${C.border};
  border-top: 2px solid ${C.accent};
  border-radius: 16px;
  padding: 1.75rem;
  margin-bottom: 2.5rem;
  animation: ${slideIn} 0.28s ease;
`;

const FormPanelTitle = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  color: ${C.accent};
  margin-bottom: 1.25rem;
`;

const FormRow = styled.div`
  display: flex;
  gap: 0.85rem;
  align-items: flex-end;
  flex-wrap: wrap;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: ${p => p.$flex || '1'};
  min-width: ${p => p.$min || '0'};
`;

const Label = styled.label`
  font-family: 'Syne', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${C.dimmer};
`;

const Input = styled.input`
  background: ${C.surfaceUp};
  border: 1.5px solid ${C.border};
  border-radius: 9px;
  padding: 0.58rem 0.85rem;
  font-size: 0.88rem;
  font-family: 'DM Sans', sans-serif;
  color: ${C.white};
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;

  &::placeholder { color: ${C.dimmer}; }
  &:focus {
    outline: none;
    border-color: ${C.accent};
    box-shadow: 0 0 0 3px ${C.accentGlow};
  }
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const ColorSwatch = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${p => p.$c || '#10b981'};
  border: 1.5px solid ${C.border};
  flex-shrink: 0;
  transition: background 0.2s;
`;

const ColorInput = styled(Input)`flex: 1;`;

const FormActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1.2rem;
`;

const ErrorBanner = styled.div`
  margin-top: 0.75rem;
  padding: 0.6rem 0.9rem;
  background: ${C.dangerDim};
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 8px;
  font-size: 0.82rem;
  color: ${C.danger};
`;

const FetchError = styled(ErrorBanner)`
  margin-bottom: 2rem;
  margin-top: 0;
`;

const RetryLink = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

const MusicGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.1rem;
`;

const MusicCard = styled.div`
  background: ${C.surface};
  border: 1.5px solid ${C.border};
  border-radius: 18px;
  padding: 1.25rem 1.4rem;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  position: relative;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  animation: ${fadeUp} 0.4s ease both;
  animation-delay: ${p => p.$i * 50}ms;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${p => p.$accent || C.accent}44;
    border-color: ${p => p.$accent || C.accent}55;
  }
`;


const CardActions = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.35rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;

  ${MusicCard}:hover & {
    opacity: 1;
    pointer-events: all;
  }

  @media (max-width: 768px) {
    opacity: 1;
    pointer-events: all;
  }
`;

const MusicDot = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 13px;
  background: ${p => p.$c};
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
`;

const BarGroup = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2.5px;
  height: 18px;
`;

const Bar = styled.span`
  display: block;
  width: 3px;
  border-radius: 2px;
  background: ${p => p.$c};
  animation: ${barBounce} ${p => p.$dur}s ease-in-out infinite;
  animation-delay: ${p => p.$delay}s;
  height: 100%;
  transform-origin: bottom;
`;

const MusicInfo = styled.div`
  flex: 1;
  min-width: 0;
  padding-right: 2rem;
`;

const MusicArtist = styled.div`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-weight: 700;
  color: ${C.dimmer};
  margin-bottom: 0.18rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MusicTrack = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  color: ${C.white};
  line-height: 1.2;
  margin-bottom: 0.28rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MusicMood = styled.div`
  font-size: 0.78rem;
  color: ${C.muted};
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const InlineEdit = styled.div`
  width: 100%;
  animation: ${slideIn} 0.2s ease;
`;

const InlineInput = styled(Input)`
  padding: 0.4rem 0.65rem;
  font-size: 0.82rem;
  margin-bottom: 0.4rem;
`;

const SkeletonCard = styled.div`
  background: linear-gradient(90deg, ${C.surface} 25%, ${C.surfaceUp} 50%, ${C.surface} 75%);
  background-size: 600px 100%;
  animation: ${shimmer} 1.4s infinite linear;
  border: 1.5px solid ${C.border};
  border-radius: 18px;
  height: 80px;
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 4.5rem 2rem;
  color: ${C.dimmer};
`;

const EmptyEmoji = styled.div`font-size: 2.4rem; margin-bottom: 0.9rem;`;
const EmptyTitle = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${C.muted};
  margin-bottom: 0.35rem;
`;
const EmptyDesc = styled.div`font-size: 0.84rem;`;

const Spinner = styled.span`
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  margin-right: 5px;
  vertical-align: middle;
`;

const ToastWrap = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ToastItem = styled.div`
  background: ${p => p.$err ? '#1f1010' : '#0f1f17'};
  border: 1.5px solid ${p => p.$err ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'};
  border-radius: 10px;
  padding: 0.7rem 1.1rem;
  font-size: 0.83rem;
  color: ${p => p.$err ? '#fca5a5' : C.accentText};
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  animation: ${toastAnim} 0.25s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 300px;
`;

const isValidHex = (v) => /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(v);
const EMPTY_FORM  = { artist: '', track: '', mood: '', color: '#10b981' };

const BAR_PROPS = [
  { dur: '0.8', delay: '0'    },
  { dur: '1.1', delay: '0.15' },
  { dur: '0.7', delay: '0.3'  },
  { dur: '1.3', delay: '0.1'  },
];

const parseError = async (res) => {
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


export default function MusicVibes() {
  const [vibes,      setVibes]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newForm,    setNewForm]    = useState(EMPTY_FORM);
  const [createErr,  setCreateErr]  = useState(null);
  const [creating,   setCreating]   = useState(false);

  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState(EMPTY_FORM);
  const [editErr,    setEditErr]    = useState(null);
  const [saving,     setSaving]     = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [toasts,     setToasts]     = useState([]);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, err }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);


  const fetchVibes = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setVibes(await res.json());
    } catch (e) {
      console.error('[MusicVibes] fetch error:', e);
      setFetchErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVibes(); }, [fetchVibes]);


  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newForm.artist.trim() || !newForm.track.trim()) {
      setCreateErr('Artist and track are required.');
      return;
    }
    if (!isValidHex(newForm.color)) {
      setCreateErr('Color must be a valid hex code (e.g. #6366f1).');
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: newForm.artist.trim(),
          track:  newForm.track.trim(),
          mood:   newForm.mood.trim(),
          color:  newForm.color,
        }),
      });
      if (!res.ok) { setCreateErr(await parseError(res)); return; }
      const created = await res.json();
      setVibes(prev => [created, ...prev]);
      setNewForm(EMPTY_FORM);
      setIsCreating(false);
      toast('Track added ✓');
    } catch (e) {
      console.error('[MusicVibes] create error:', e);
      setCreateErr('Network error — check that Django is running and /api/music-vibes/ is reachable.');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (v) => {
    setEditId(v.id);
    setEditForm({ artist: v.artist, track: v.track, mood: v.mood || '', color: v.color });
    setEditErr(null);
  };


  const handleUpdate = async (e, id) => {
    e.preventDefault();
    if (!editForm.artist.trim() || !editForm.track.trim()) {
      setEditErr('Artist and track are required.');
      return;
    }
    if (!isValidHex(editForm.color)) {
      setEditErr('Color must be a valid hex code.');
      return;
    }
    setSaving(true);
    setEditErr(null);
    try {
      const res = await fetch(`${ENDPOINT}${id}/`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: editForm.artist.trim(),
          track:  editForm.track.trim(),
          mood:   editForm.mood.trim(),
          color:  editForm.color,
        }),
      });
      if (!res.ok) { setEditErr(await parseError(res)); return; }
      const updated = await res.json();
      setVibes(prev => prev.map(v => v.id === id ? updated : v));
      setEditId(null);
      toast('Track updated ✓');
    } catch (e) {
      console.error('[MusicVibes] update error:', e);
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
      setVibes(prev => prev.filter(v => v.id !== id));
      toast('Track removed');
    } catch (e) {
      console.error('[MusicVibes] delete error:', e);
      toast('Network error.', true);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <GlobalStyle />

      <Page>
        <EyebrowRow>
          <Eyebrow>Music Vibes</Eyebrow>
          <EyebrowLine />
        </EyebrowRow>

        <HeaderRow>
          <HeadingBlock>
            <PageTitle>Songs On <em>Repeat</em></PageTitle>
            <PageDesc>
              The playlist that plays behind every coding session, rainy evening, and 2am thought spiral.
            </PageDesc>
          </HeadingBlock>
          <AddButton
            $open={isCreating}
            onClick={() => {
              setIsCreating(v => !v);
              setCreateErr(null);
              setNewForm(EMPTY_FORM);
            }}
          >
            {isCreating ? '✕ Close' : '+ Add Track'}
          </AddButton>
        </HeaderRow>

        {isCreating && (
          <FormPanel>
            <FormPanelTitle>New Track Entry</FormPanelTitle>
            <form onSubmit={handleCreate}>
              <FormRow>
                <Field $flex="1" $min="140px">
                  <Label>Artist *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. The Midnight"
                    value={newForm.artist}
                    onChange={e => setNewForm({ ...newForm, artist: e.target.value })}
                  />
                </Field>
                <Field $flex="1" $min="140px">
                  <Label>Track *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Sunset"
                    value={newForm.track}
                    onChange={e => setNewForm({ ...newForm, track: e.target.value })}
                  />
                </Field>
                <Field $flex="1.5" $min="180px">
                  <Label>Mood / Vibe</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 2am Deep-Focus Synth Loops"
                    value={newForm.mood}
                    onChange={e => setNewForm({ ...newForm, mood: e.target.value })}
                  />
                </Field>
                <Field $flex="0 0 160px" $min="140px">
                  <Label>Accent Color</Label>
                  <ColorRow>
                    <ColorSwatch $c={isValidHex(newForm.color) ? newForm.color : '#10b981'} />
                    <ColorInput
                      type="text"
                      placeholder="#10b981"
                      maxLength={7}
                      value={newForm.color}
                      onChange={e => setNewForm({ ...newForm, color: e.target.value })}
                    />
                  </ColorRow>
                </Field>
              </FormRow>

              {createErr && <ErrorBanner>⚠ {createErr}</ErrorBanner>}

              <FormActions>
                <Btn $primary type="submit" disabled={creating}>
                  {creating && <Spinner />}
                  {creating ? 'Saving…' : 'Save Track'}
                </Btn>
                <Btn
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setCreateErr(null);
                    setNewForm(EMPTY_FORM);
                  }}
                >
                  Cancel
                </Btn>
              </FormActions>
            </form>
          </FormPanel>
        )}

    
        {fetchErr && (
          <FetchError>
            ⚠ Could not load tracks — {fetchErr}.{' '}
            <RetryLink onClick={fetchVibes}>Retry</RetryLink>
          </FetchError>
        )}

        <MusicGrid>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : vibes.length === 0
              ? (
                <EmptyState>
                  <EmptyEmoji>🎧</EmptyEmoji>
                  <EmptyTitle>No tracks yet</EmptyTitle>
                  <EmptyDesc>Add your first song above.</EmptyDesc>
                </EmptyState>
              )
              : vibes.map((v, i) => {
                  const accent = isValidHex(v.color) ? v.color : C.accent;
                  const dotBg  = accent + '28';

                  return (
                    <MusicCard key={v.id} $i={i} $accent={accent}>

                      {editId === v.id ? (

                        <InlineEdit>
                          <form onSubmit={e => handleUpdate(e, v.id)} style={{ width: '100%' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.1rem' }}>
                              <InlineInput
                                style={{ flex: '1 1 110px' }}
                                value={editForm.artist}
                                placeholder="Artist"
                                required
                                onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
                              />
                              <InlineInput
                                style={{ flex: '1 1 110px' }}
                                value={editForm.track}
                                placeholder="Track"
                                required
                                onChange={e => setEditForm({ ...editForm, track: e.target.value })}
                              />
                              <InlineInput
                                style={{ flex: '2 1 160px' }}
                                value={editForm.mood}
                                placeholder="Mood / vibe"
                                onChange={e => setEditForm({ ...editForm, mood: e.target.value })}
                              />
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: '0 0 140px' }}>
                                <ColorSwatch $c={isValidHex(editForm.color) ? editForm.color : C.accent} />
                                <InlineInput
                                  style={{ flex: 1, marginBottom: 0 }}
                                  value={editForm.color}
                                  placeholder="#10b981"
                                  maxLength={7}
                                  onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                                />
                              </div>
                            </div>

                            {editErr && (
                              <ErrorBanner style={{ margin: '0.35rem 0', padding: '0.4rem 0.7rem' }}>
                                ⚠ {editErr}
                              </ErrorBanner>
                            )}

                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                              <Btn
                                $primary
                                type="submit"
                                disabled={saving}
                                style={{ fontSize: '0.74rem', padding: '0.38rem 0.8rem' }}
                              >
                                {saving && <Spinner />}
                                {saving ? 'Saving…' : 'Update'}
                              </Btn>
                              <Btn
                                type="button"
                                style={{ fontSize: '0.74rem', padding: '0.38rem 0.8rem' }}
                                onClick={() => { setEditId(null); setEditErr(null); }}
                              >
                                Cancel
                              </Btn>
                            </div>
                          </form>
                        </InlineEdit>

                      ) : (

                        <>
                          <CardActions>
                            <IconBtn title="Edit" onClick={() => startEdit(v)}>✏</IconBtn>
                            <IconBtn
                              $danger
                              title="Delete"
                              disabled={deletingId === v.id}
                              onClick={() => handleDelete(v.id)}
                            >
                              {deletingId === v.id ? <Spinner /> : '✕'}
                            </IconBtn>
                          </CardActions>

                          <MusicDot $c={dotBg}>
                            <BarGroup>
                              {BAR_PROPS.map((b, idx) => (
                                <Bar key={idx} $c={accent} $dur={b.dur} $delay={b.delay} />
                              ))}
                            </BarGroup>
                          </MusicDot>

                          <MusicInfo>
                            <MusicArtist>{v.artist}</MusicArtist>
                            <MusicTrack>{v.track}</MusicTrack>
                            {v.mood && <MusicMood>{v.mood}</MusicMood>}
                          </MusicInfo>
                        </>

                      )}
                    </MusicCard>
                  );
                })
          }
        </MusicGrid>
      </Page>

      <ToastWrap>
        {toasts.map(t => (
          <ToastItem key={t.id} $err={t.err}>
            {t.err ? '✗' : '✓'} {t.msg}
          </ToastItem>
        ))}
      </ToastWrap>
    </>
  );
}