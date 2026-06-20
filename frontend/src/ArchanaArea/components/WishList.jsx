import React, { useState, useEffect } from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';

const API_BASE = import.meta.env.VITE_API_URL;
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #fafaf8;
    font-family: 'DM Sans', sans-serif;
    color: #18181b;
  }
`;


const C = {
  white:    '#ffffff',
  border:   '#e4e4e7',
  green:    '#10b981',
  dark:     '#18181b',
  soft:     '#71717a',
  muted:    '#f4f4f5',
  danger:   '#ef4444',
  dangerLt: '#fef2f2',
  greenLt:  '#f0fdf8',
};


const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-5px); }
`;


const API = {
  list:   `${API_BASE}/api/wishes/`,
  detail: (id) => `${API_BASE}//api/wishes/${id}/`,
};

const EMPTY_NEW  = { emoji: '', wish: '' };


export default function Wishlist() {
  const [wishes,     setWishes]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [toast,      setToast]      = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newWish,    setNewWish]    = useState(EMPTY_NEW);
  const [creating,   setCreating]   = useState(false);

  const [editingId,  setEditingId]  = useState(null);
  const [editWish,   setEditWish]   = useState(EMPTY_NEW);
  const [updating,   setUpdating]   = useState(false);

  useEffect(() => { fetchWishes(); }, []);

  const fetchWishes = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(API.list);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setWishes(await res.json());
    } catch {
      setFetchError('Could not load wishes. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };


  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWish.wish.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(API.list, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          emoji: newWish.emoji.trim() || '✨',
          wish:  newWish.wish.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const key = Object.keys(err)[0];
        throw new Error(key ? `${key}: ${Array.isArray(err[key]) ? err[key][0] : err[key]}` : 'Failed to save.');
      }
      const created = await res.json();
      setWishes(p => [created, ...p]);
      setNewWish(EMPTY_NEW);
      setIsCreating(false);
      showToast('Wish added ✨');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditWish({ emoji: item.emoji, wish: item.wish });
  };

  const handleUpdate = async (e, id) => {
    e.preventDefault();
    if (!editWish.wish.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch(API.detail(id), {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          emoji: editWish.emoji.trim() || '✨',
          wish:  editWish.wish.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const key = Object.keys(err)[0];
        throw new Error(key ? `${key}: ${Array.isArray(err[key]) ? err[key][0] : err[key]}` : 'Update failed.');
      }
      const updated = await res.json();
      setWishes(p => p.map(w => w.id === id ? updated : w));
      setEditingId(null);
      showToast('Wish updated.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this wish permanently?')) return;
    try {
      const res = await fetch(API.detail(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setWishes(p => p.filter(w => w.id !== id));
      showToast('Wish removed.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  
  return (
    <>
      <GlobalStyle />
      <ContentWrap>

        {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

        <SecHeading>Wish List</SecHeading>

        <HeaderRow>
          <TextBlock>
            <SecTitle>Things I <em>Dream About</em></SecTitle>
            <SecDesc>Not needs. Pure wants. The daydreams I return to when I need a reason to keep going.</SecDesc>
          </TextBlock>
          <PanelButton $open={isCreating} onClick={() => { setIsCreating(p => !p); setNewWish(EMPTY_NEW); }}>
            {isCreating ? 'Close Panel' : '+ Add Dream Wish'}
          </PanelButton>
        </HeaderRow>

        {isCreating && (
          <FormBlock onSubmit={handleCreate}>
            <FormGroup $flex="0.12">
              <FormLabel>Emoji</FormLabel>
              <Input
                type="text"
                placeholder="✨"
                maxLength={2}
                value={newWish.emoji}
                onChange={e => setNewWish(p => ({ ...p, emoji: e.target.value }))}
              />
            </FormGroup>
            <FormGroup $flex="1">
              <FormLabel>Dream / Want</FormLabel>
              <Input
                type="text"
                placeholder="Describe your daydream…"
                required
                value={newWish.wish}
                onChange={e => setNewWish(p => ({ ...p, wish: e.target.value }))}
              />
            </FormGroup>
            <PanelButton type="submit" disabled={creating} style={{ height: '42px' }}>
              {creating ? '…' : 'Save Wish'}
            </PanelButton>
          </FormBlock>
        )}

        {fetchError && <ErrorBanner>{fetchError}</ErrorBanner>}

        {loading && (
          <LoadRow>
            <Dot $d="0s" /><Dot $d=".15s" /><Dot $d=".3s" />
            <span>Loading wishes…</span>
          </LoadRow>
        )}

        {!loading && !fetchError && wishes.length === 0 && (
          <EmptyState>
            <span>✨</span>
            <p>No wishes yet. Add your first daydream above.</p>
          </EmptyState>
        )}

        {wishes.length > 0 && (
          <WishGrid>
            {wishes.map((w, i) => {
              const isItemEditing = editingId === w.id;
              return (
                <WishCard key={w.id} style={{ animationDelay: `${i * 0.04}s` }}>
                  {isItemEditing ? (
                    <EditForm onSubmit={(e) => handleUpdate(e, w.id)}>
                      <EditRow>
                        <Input
                          type="text"
                          maxLength={2}
                          style={{ width: '52px', padding: '0.4rem 0.5rem' }}
                          value={editWish.emoji}
                          onChange={e => setEditWish(p => ({ ...p, emoji: e.target.value }))}
                        />
                        <Input
                          type="text"
                          required
                          style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                          value={editWish.wish}
                          onChange={e => setEditWish(p => ({ ...p, wish: e.target.value }))}
                        />
                      </EditRow>
                      <EditActions>
                        <PanelButton
                          type="submit"
                          disabled={updating}
                          style={{ padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}
                        >
                          {updating ? '…' : 'Update'}
                        </PanelButton>
                        <PanelButton
                          type="button"
                          $open
                          onClick={() => setEditingId(null)}
                          style={{ padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}
                        >
                          Cancel
                        </PanelButton>
                      </EditActions>
                    </EditForm>
                  ) : (
                    <>
                      <WishEmoji>{w.emoji || '✨'}</WishEmoji>
                      <WishText>{w.wish}</WishText>
                      <CardControls>
                        <ControlButton onClick={() => startEditing(w)} title="Edit">✏️</ControlButton>
                        <ControlButton $danger onClick={() => handleDelete(w.id)} title="Delete">✕</ControlButton>
                      </CardControls>
                    </>
                  )}
                </WishCard>
              );
            })}
          </WishGrid>
        )}

      </ContentWrap>
    </>
  );
}


const ContentWrap = styled.div`
  padding: 3.5rem 3rem 6rem;
  max-width: 1280px;
  margin: 0 auto;
  animation: ${fadeUp} 0.4s ease forwards;
  position: relative;

  @media (max-width: 768px) { padding: 2rem 1.5rem 4rem; }
`;

const Toast = styled.div`
  position: fixed;
  top: 1.5rem; right: 1.5rem;
  z-index: 1000;
  padding: 0.7rem 1.25rem;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 0.78rem;
  font-weight: 500;
  animation: ${fadeUp} 0.25s ease;
  background: ${p => p.$type === 'error' ? C.dangerLt   : C.greenLt};
  color:      ${p => p.$type === 'error' ? C.danger      : C.green};
  border: 1px solid ${p => p.$type === 'error' ? '#fecaca' : '#a7f3d0'};
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
`;

const SecHeading = styled.h2`
  font-family: 'Syne', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: ${C.soft};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;

  &::after { content: ''; flex: 1; height: 1px; background: ${C.border}; }
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2.5rem;

  @media (max-width: 640px) { flex-direction: column; gap: 1rem; }
`;

const TextBlock = styled.div`flex: 1;`;

const SecTitle = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  color: ${C.dark};
  letter-spacing: -0.03em;
  margin-bottom: 0.5rem;

  em { font-style: normal; color: ${C.green}; }
`;

const SecDesc = styled.p`
  font-size: 0.95rem;
  color: ${C.soft};
  max-width: 560px;
  line-height: 1.7;
`;

const PanelButton = styled.button`
  font-family: 'Syne', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${p => p.$open ? C.muted   : C.dark};
  color:      ${p => p.$open ? C.soft    : C.white};
  border: 1px solid ${p => p.$open ? C.border : C.dark};
  padding: 0.65rem 1.2rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background:   ${p => p.$open ? C.border : C.green};
    border-color: ${p => p.$open ? C.border : C.green};
    color:        ${p => p.$open ? C.dark   : C.white};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const FormBlock = styled.form`
  background: ${C.muted};
  border: 1.5px solid ${C.border};
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  animation: ${fadeUp} 0.25s ease;

  @media (max-width: 768px) { flex-direction: column; align-items: stretch; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: ${p => p.$flex || '1'};
`;

const FormLabel = styled.label`
  font-family: 'Syne', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: ${C.soft};
  letter-spacing: 1px;
`;

const Input = styled.input`
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  font-size: 0.9rem;
  color: ${C.dark};
  font-family: inherit;
  transition: border-color 0.15s;
  outline: none;

  &:focus { border-color: ${C.green}; }
`;

const ErrorBanner = styled.div`
  background: ${C.dangerLt};
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: ${C.danger};
  font-family: 'DM Mono', monospace;
  font-size: 0.78rem;
  padding: 0.85rem 1.2rem;
  margin-bottom: 1.5rem;
`;

const LoadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'DM Mono', monospace;
  font-size: 0.8rem;
  color: ${C.soft};
  padding: 3rem;
  justify-content: center;
`;

const Dot = styled.span`
  width: 7px; height: 7px;
  background: ${C.green};
  border-radius: 50%;
  display: inline-block;
  animation: ${dotBounce} 1s ease infinite;
  animation-delay: ${p => p.$d};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${C.soft};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;

  span { font-size: 2.5rem; }
  p { font-size: 0.95rem; }
`;

const WishGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.1rem;
`;

const WishCard = styled.div`
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 14px;
  padding: 1.2rem 1.4rem;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  position: relative;
  cursor: default;
  animation: ${fadeUp} 0.4s ease both;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(26,26,46,0.07);
    border-color: ${C.green};
  }
`;

const CardControls = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 1.2rem;
  display: flex;
  gap: 0.4rem;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${WishCard}:hover & { opacity: 1; }
`;

const ControlButton = styled.button`
  background: ${p => p.$danger ? C.dangerLt : C.muted};
  border: 1px solid ${p => p.$danger ? '#fecaca' : C.border};
  color: ${p => p.$danger ? C.danger : C.soft};
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s ease;

  &:hover {
    background:   ${p => p.$danger ? C.danger : C.dark};
    border-color: ${p => p.$danger ? C.danger : C.dark};
    color: ${C.white};
  }
`;

const WishEmoji = styled.span`font-size: 1.5rem; flex-shrink: 0;`;

const WishText = styled.div`
  font-size: 0.9rem;
  color: ${C.dark};
  font-weight: 500;
  line-height: 1.45;
  padding-right: 4.5rem;
`;

const EditForm = styled.form`width: 100%;`;

const EditRow = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
`;

const EditActions = styled.div`
  display: flex;
  gap: 0.4rem;
`;