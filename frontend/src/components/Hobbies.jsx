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
  greenLt:  '#eafaf1',
  dark:     '#18181b',
  soft:     '#71717a',
  muted:    '#f4f4f5',
  danger:   '#ef4444',
  dangerLt: '#fef2f2',
};


const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;



const API = {
  list:   `${API_BASE}/api/hobbies/`,
  detail: (id) => `${API_BASE}/api/hobbies/${id}/`,
};

const EMPTY_FORM = { emoji: '', title: '', text: '' };

export default function Hobbies() {
  const [hobbies,    setHobbies]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [toast,      setToast]      = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newHobby,   setNewHobby]   = useState(EMPTY_FORM);
  const [creating,   setCreating]   = useState(false);

  const [editingId,  setEditingId]  = useState(null);
  const [editHobby,  setEditHobby]  = useState(EMPTY_FORM);
  const [updating,   setUpdating]   = useState(false);

  useEffect(() => { fetchHobbies(); }, []);

  const fetchHobbies = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(API.list);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setHobbies(await res.json());
    } catch {
      setFetchError('Could not load hobbies. Make sure the backend is running.');
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
    if (!newHobby.title.trim() || !newHobby.text.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(API.list, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          emoji: newHobby.emoji.trim() || '✨',
          title: newHobby.title.trim(),
          text:  newHobby.text.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const key = Object.keys(err)[0];
        throw new Error(key
          ? `${key}: ${Array.isArray(err[key]) ? err[key][0] : err[key]}`
          : 'Failed to save hobby.');
      }
      const created = await res.json();      setHobbies(p => [...p, created]);
      setNewHobby(EMPTY_FORM);
      setIsCreating(false);
      showToast('Hobby added.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (hobby) => {
    setEditingId(hobby.id);
    setEditHobby({ emoji: hobby.emoji, title: hobby.title, text: hobby.text });
  };


  const handleUpdate = async (e, id) => {
    e.preventDefault();
    if (!editHobby.title.trim() || !editHobby.text.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch(API.detail(id), {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          emoji: editHobby.emoji.trim() || '✨',
          title: editHobby.title.trim(),
          text:  editHobby.text.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const key = Object.keys(err)[0];
        throw new Error(key
          ? `${key}: ${Array.isArray(err[key]) ? err[key][0] : err[key]}`
          : 'Update failed.');
      }
      const updated = await res.json();
      setHobbies(p => p.map(h => h.id === id ? updated : h));
      setEditingId(null);
      showToast('Hobby updated.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };  const handleDelete = async (id) => {
    if (!window.confirm('Remove this hobby permanently?')) return;
    try {
      const res = await fetch(API.detail(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setHobbies(p => p.filter(h => h.id !== id));
      showToast('Hobby removed.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <GlobalStyle />
      <ContentWrap>

        {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

        <SecHeading>Hobbies</SecHeading>

        <HeaderRow>
          <TextBlock>
            <SecTitle>Things I <em>Love</em> Doing</SecTitle>
            <SecDesc>Beyond the code editor — the things that keep me human and curious.</SecDesc>
          </TextBlock>
          <TopActionButton
            $isOpen={isCreating}
            onClick={() => { setIsCreating(p => !p); setNewHobby(EMPTY_FORM); }}
          >
            {isCreating ? 'Close Panel' : '+ Add New Hobby'}
          </TopActionButton>
        </HeaderRow>
        {isCreating && (
          <FormBlock onSubmit={handleCreate}>
            <FormGroup $flex="0.12">
              <FormLabel>Emoji</FormLabel>
              <Input
                type="text"
                placeholder="📸"
                maxLength={12}
                value={newHobby.emoji}
                onChange={e => setNewHobby(p => ({ ...p, emoji: e.target.value }))}
              />
            </FormGroup>
            <FormGroup $flex="0.35">
              <FormLabel>Title</FormLabel>
              <Input
                type="text"
                placeholder="e.g. Astronomy"
                required
                value={newHobby.title}
                onChange={e => setNewHobby(p => ({ ...p, title: e.target.value }))}
              />
            </FormGroup>
            <FormGroup $flex="1">
              <FormLabel>Description</FormLabel>
              <Input
                type="text"
                placeholder="What makes you love this?"
                required
                value={newHobby.text}
                onChange={e => setNewHobby(p => ({ ...p, text: e.target.value }))}
              />
            </FormGroup>
            <TopActionButton type="submit" disabled={creating} style={{ height: '42px' }}>
              {creating ? '…' : 'Save Hobby'}
            </TopActionButton>
          </FormBlock>
        )}
        {fetchError && <ErrorBanner>{fetchError}</ErrorBanner>}
        <HobbyGrid>
          {loading && (
            <>
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </>
          )}

          {!loading && !fetchError && hobbies.length === 0 && (
            <EmptyState>
              <span>🌱</span>
              <p>No hobbies yet. Add something you love above.</p>
            </EmptyState>
          )}

          {!loading && hobbies.map((h, i) => {
            const isItemEditing = editingId === h.id;

            return (
              <HobbyCard key={h.id} style={{ animationDelay: `${i * 0.05}s` }}>
                {isItemEditing ? (                  <EditForm onSubmit={(e) => handleUpdate(e, h.id)}>
                    <FormGroup style={{ marginBottom: '0.5rem' }}>
                      <FormLabel>Emoji & Title</FormLabel>
                      <EmojiTitleRow>
                        <Input
                          type="text"
                          maxLength={12}
                          style={{ width: '52px', padding: '0.4rem 0.5rem' }}
                          value={editHobby.emoji}
                          onChange={e => setEditHobby(p => ({ ...p, emoji: e.target.value }))}
                        />
                        <Input
                          type="text"
                          required
                          style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                          value={editHobby.title}
                          onChange={e => setEditHobby(p => ({ ...p, title: e.target.value }))}
                        />
                      </EmojiTitleRow>
                    </FormGroup>
                    <FormGroup style={{ marginBottom: '0.65rem' }}>
                      <FormLabel>Description</FormLabel>
                      <Input
                        type="text"
                        required
                        style={{ padding: '0.4rem 0.6rem' }}
                        value={editHobby.text}
                        onChange={e => setEditHobby(p => ({ ...p, text: e.target.value }))}
                      />
                    </FormGroup>
                    <InlineFormButtons>
                      <TopActionButton
                        type="submit"
                        disabled={updating}
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
                      >
                        {updating ? '…' : 'Update'}
                      </TopActionButton>
                      <TopActionButton
                        type="button"
                        $isOpen
                        onClick={() => setEditingId(null)}
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
                      >
                        Cancel
                      </TopActionButton>
                    </InlineFormButtons>
                  </EditForm>
                ) : (                  <>
                    <CardControls>
                      <ControlButton onClick={() => startEditing(h)} title="Edit">✏️</ControlButton>
                      <ControlButton $danger onClick={() => handleDelete(h.id)} title="Delete">✕</ControlButton>
                    </CardControls>
                    <div>
                      <HobbyEmoji>{h.emoji || '✨'}</HobbyEmoji>
                      <HobbyTitle>{h.title}</HobbyTitle>
                      <HobbyText>{h.text}</HobbyText>
                    </div>
                  </>
                )}
              </HobbyCard>
            );
          })}
        </HobbyGrid>

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
  background: ${p => p.$type === 'error' ? C.dangerLt  : C.greenLt};
  color:      ${p => p.$type === 'error' ? C.danger     : C.green};
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

const TopActionButton = styled.button`
  font-family: 'Syne', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${p => p.$isOpen ? C.muted   : C.dark};
  color:      ${p => p.$isOpen ? C.soft    : C.white};
  border: 1px solid ${p => p.$isOpen ? C.border : C.dark};
  padding: 0.65rem 1.2rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background:   ${p => p.$isOpen ? C.border : C.green};
    border-color: ${p => p.$isOpen ? C.border : C.green};
    color:        ${p => p.$isOpen ? C.dark   : C.white};
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

const InlineFormButtons = styled.div`
  display: flex;
  gap: 0.5rem;
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

const HobbyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
`;

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const SkeletonCard = styled.div`
  border-radius: 16px;
  height: 160px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 800px 100%;
  animation: ${shimmer} 1.4s infinite linear;
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
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

const HobbyCard = styled.div`
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 16px;
  padding: 1.6rem;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  animation: ${fadeUp} 0.4s ease both;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(26,26,46,0.08);
    border-color: ${C.green};
  }
`;

const CardControls = styled.div`
  position: absolute;
  top: 1.2rem; right: 1.2rem;
  display: flex;
  gap: 0.4rem;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${HobbyCard}:hover & { opacity: 1; }
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
  font-size: 0.8rem;
  transition: all 0.15s ease;

  &:hover {
    background:   ${p => p.$danger ? C.danger : C.dark};
    border-color: ${p => p.$danger ? C.danger : C.dark};
    color: ${C.white};
  }
`;

const HobbyEmoji = styled.div`font-size: 1.8rem; margin-bottom: 0.8rem;`;
const HobbyTitle = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  color: ${C.dark};
  margin-bottom: 0.35rem;
`;
const HobbyText = styled.div`
  font-size: 0.875rem;
  color: ${C.soft};
  line-height: 1.65;
`;

const EditForm = styled.form`width: 100%;`;

const EmojiTitleRow = styled.div`
  display: flex;
  gap: 0.4rem;
`;