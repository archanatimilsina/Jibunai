import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
const API_BASE = import.meta.env.VITE_API_URL;

const C = {
  white: '#ffffff',
  border: '#e5e7eb',
  greenLt: '#d1fae5',
  green: '#10b981',
  muted: '#f3f4f6',
  dark: '#111827',
  soft: '#6b7280',
  danger: '#ef4444',
  dangerLt: '#fef2f2',
};


const BASE_URL = `${API_BASE}/api`;


const contentFade = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;


export default function Goals() {
  const [goals, setGoals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId]   = useState(null);

  const [newGoal, setNewGoal]   = useState({ emoji: '', title: '', timeline: '' });
  const [editGoal, setEditGoal] = useState({ emoji: '', title: '', timeline: '' });

  useEffect(() => { fetchGoals(); }, []);

  const fetchGoals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/Goals/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setGoals(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.log(err)
      setError('Failed to load goals. Check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim() || !newGoal.timeline.trim()) return;

    setSavingId('new');
    setError('');
    try {
      const payload = {
        emoji:    newGoal.emoji.trim() || '🎯',
        title:    newGoal.title.trim(),
        timeline: newGoal.timeline.trim(),
        done:     false,
      };
      const res = await fetch(`${BASE_URL}/Goals/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const created = await res.json();
      setGoals(prev => [created, ...prev]);
      setNewGoal({ emoji: '', title: '', timeline: '' });
      setIsCreating(false);
    } catch (err) {
      setError(err.message || 'Failed to create goal.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleGoalStatus = async (goal) => {
    setSavingId(goal.id);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/Goals/${goal.id}/`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ done: !goal.done }),
      });
      if (!res.ok) throw new Error('Toggle failed.');
      const updated = await res.json();
      setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
    } catch (err) {
      setError(err.message || 'Could not update status.');
    } finally {
      setSavingId(null);
    }
  };

  const startEditing = (goal) => {
    setEditingId(goal.id);
    setEditGoal({ emoji: goal.emoji, title: goal.title, timeline: goal.timeline });
  };

  const handleUpdateSubmit = async (e, goal) => {
    e.preventDefault();
    if (!editGoal.title.trim() || !editGoal.timeline.trim()) return;

    setSavingId(goal.id);
    setError('');
    try {
      const payload = {
        emoji:    editGoal.emoji.trim() || '🎯',
        title:    editGoal.title.trim(),
        timeline: editGoal.timeline.trim(),
        done:     goal.done,
      };
      const res = await fetch(`${BASE_URL}/Goals/${goal.id}/`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const updated = await res.json();
      setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Failed to update goal.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal permanently?')) return;
    setSavingId(id);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/Goals/${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed.');
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      setError(err.message || 'Could not delete goal.');
    } finally {
      setSavingId(null);
    }
  };

  const isNewSaving = savingId === 'new';


  return (
    <ContentWrap>
      <SecHeading>Goals</SecHeading>

      <HeaderRow>
        <div>
          <SecTitle>Things I'm <em>Working Toward</em></SecTitle>
          <SecDesc>A living list of dreams, intentions, and checkboxes. Some ticked. Most still in progress.</SecDesc>
        </div>
        <ActionButton $active={isCreating} onClick={() => { setIsCreating(!isCreating); setError(''); }}>
          {isCreating ? 'Cancel' : '+ Add Goal'}
        </ActionButton>
      </HeaderRow>

      {error && <ErrorBanner>{error} <DismissBtn onClick={() => setError('')}>✕</DismissBtn></ErrorBanner>}

      {isCreating && (
        <FormBlock onSubmit={handleCreateSubmit}>
          <FormGroup $flex="0.12">
            <FormLabel>Emoji</FormLabel>
            <Input
              type="text"
              placeholder="🎯"
              maxLength={2}
              value={newGoal.emoji}
              onChange={e => setNewGoal({ ...newGoal, emoji: e.target.value })}
              disabled={isNewSaving}
            />
          </FormGroup>
          <FormGroup $flex="0.55">
            <FormLabel>Objective</FormLabel>
            <Input
              type="text"
              placeholder="What are you building?"
              required
              value={newGoal.title}
              onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
              disabled={isNewSaving}
            />
          </FormGroup>
          <FormGroup $flex="0.28">
            <FormLabel>Timeline</FormLabel>
            <Input
              type="text"
              placeholder="e.g. Q4 2026 / Ongoing"
              required
              value={newGoal.timeline}
              onChange={e => setNewGoal({ ...newGoal, timeline: e.target.value })}
              disabled={isNewSaving}
            />
          </FormGroup>
          <ActionButton type="submit" style={{ height: '38px' }} disabled={isNewSaving}>
            {isNewSaving ? <Spinner /> : 'Save'}
          </ActionButton>
        </FormBlock>
      )}

      {loading && (
        <LoadingRow>
          <Spinner $large /> Loading goals...
        </LoadingRow>
      )}

      {!loading && goals.length === 0 && !error && (
        <EmptyState>No goals yet. Add your first one above.</EmptyState>
      )}

      {!loading && goals.length > 0 && (
        <GoalList>
          {goals.map((g) => {
            const isItemEditing = editingId === g.id;
            const isBusy = savingId === g.id;

            return (
              <GoalItem key={g.id} $done={g.done} $busy={isBusy}>

                {isItemEditing ? (
                  <form
                    onSubmit={e => handleUpdateSubmit(e, g)}
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                  >
                    <EditRow>
                      <Input
                        type="text"
                        style={{ width: '48px', padding: '0.4rem', textAlign: 'center' }}
                        value={editGoal.emoji}
                        maxLength={2}
                        onChange={e => setEditGoal({ ...editGoal, emoji: e.target.value })}
                        disabled={isBusy}
                      />
                      <Input
                        type="text"
                        style={{ flex: 1, padding: '0.4rem' }}
                        value={editGoal.title}
                        required
                        onChange={e => setEditGoal({ ...editGoal, title: e.target.value })}
                        disabled={isBusy}
                      />
                      <Input
                        type="text"
                        style={{ width: '130px', padding: '0.4rem' }}
                        value={editGoal.timeline}
                        required
                        onChange={e => setEditGoal({ ...editGoal, timeline: e.target.value })}
                        disabled={isBusy}
                      />
                    </EditRow>
                    <InlineFormButtons>
                      <ActionButton type="submit" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} disabled={isBusy}>
                        {isBusy ? <Spinner /> : 'Update'}
                      </ActionButton>
                      <ActionButton
                        type="button"
                        $active
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => setEditingId(null)}
                        disabled={isBusy}
                      >
                        Cancel
                      </ActionButton>
                    </InlineFormButtons>
                  </form>
                ) : (
                  <>
                    <GoalCheck $done={g.done} onClick={() => !isBusy && toggleGoalStatus(g)} title="Toggle Completion">
                      {isBusy
                        ? <Spinner />
                        : g.done
                          ? '✓'
                          : <GoalEmoji>{g.emoji}</GoalEmoji>
                      }
                    </GoalCheck>
                    <GoalText>
                      <GoalTitle $done={g.done}>{g.title}</GoalTitle>
                      <GoalTime>{g.timeline}</GoalTime>
                    </GoalText>
                    <CardControls>
                      <ControlButton
                        onClick={() => startEditing(g)}
                        title="Edit"
                        disabled={isBusy}
                      >✏️</ControlButton>
                      <ControlButton
                        $danger
                        onClick={() => handleDelete(g.id)}
                        title="Delete"
                        disabled={isBusy}
                      >✕</ControlButton>
                    </CardControls>
                  </>
                )}
              </GoalItem>
            );
          })}
        </GoalList>
      )}
    </ContentWrap>
  );
}


const ContentWrap = styled.div`
  max-width: 700px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  animation: ${contentFade} .4s ease forwards;
`;

const SecHeading = styled.span`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${C.soft};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 0.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  @media (max-width: 500px) { flex-direction: column; align-items: stretch; }
`;

const SecTitle = styled.h2`
  font-size: 2.2rem;
  font-weight: 800;
  color: ${C.dark};
  margin: 0 0 1rem 0;
  em { font-style: normal; color: ${C.green}; }
`;

const SecDesc = styled.p`
  font-size: 1.05rem;
  color: ${C.soft};
  line-height: 1.6;
  margin: 0;
`;

const ActionButton = styled.button`
  font-size: 0.85rem;
  font-weight: 700;
  background: ${p => p.$active ? C.muted : C.dark};
  color: ${p => p.$active ? C.dark : C.white};
  border: 1px solid ${p => p.$active ? C.border : C.dark};
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  &:hover:not(:disabled) {
    background: ${p => p.$active ? C.border : C.green};
    border-color: ${p => p.$active ? C.border : C.green};
    color: ${p => p.$active ? C.dark : C.white};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const FormBlock = styled.form`
  background: ${C.muted};
  border: 1.5px solid ${C.border};
  border-radius: 14px;
  padding: 1.25rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 0.85rem;
  align-items: flex-end;
  animation: ${contentFade} 0.25s ease;
  @media (max-width: 600px) { flex-direction: column; align-items: stretch; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: ${p => p.$flex || '1'};
`;

const FormLabel = styled.label`
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: ${C.soft};
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  color: ${C.dark};
  transition: border-color 0.15s;
  font-family: inherit;
  &:focus { outline: none; border-color: ${C.green}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const EditRow = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
  @media (max-width: 480px) { flex-wrap: wrap; }
`;

const InlineFormButtons = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-top: 0.2rem;
`;

const GoalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const GoalItem = styled.div`
  background: ${C.white};
  border: 1.5px solid ${p => p.$done ? C.greenLt : C.border};
  border-radius: 14px;
  padding: 1.1rem 1.4rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  opacity: ${p => p.$busy ? 0.6 : 1};
  transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.2s ease;
  &:hover { transform: translateX(4px); box-shadow: 0 6px 20px rgba(26,26,46,0.06); }
`;

const GoalCheck = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  flex-shrink: 0;
  background: ${p => p.$done ? C.greenLt : C.muted};
  border: 1.5px solid ${p => p.$done ? '#b7e4c7' : C.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  &:hover { border-color: ${C.green}; background: ${p => p.$done ? C.greenLt : '#e1e3e6'}; }
`;

const GoalText = styled.div`flex: 1; padding-right: 4.5rem;`;

const GoalTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${p => p.$done ? C.soft : C.dark};
  text-decoration: ${p => p.$done ? 'line-through' : 'none'};
  transition: color 0.2s ease;
`;

const GoalTime = styled.div`
  font-size: 0.75rem;
  color: ${C.soft};
  margin-top: 0.15rem;
`;

const GoalEmoji = styled.span`font-size: 1.15rem;`;

const CardControls = styled.div`
  position: absolute;
  right: 1.2rem;
  display: flex;
  gap: 0.35rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  ${GoalItem}:hover & { opacity: 1; }
`;

const ControlButton = styled.button`
  background: ${p => p.$danger ? C.dangerLt : C.muted};
  border: 1px solid ${p => p.$danger ? '#fecaca' : C.border};
  color: ${p => p.$danger ? C.danger : C.soft};
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s ease;
  &:hover:not(:disabled) {
    background: ${p => p.$danger ? C.danger : C.dark};
    border-color: ${p => p.$danger ? C.danger : C.dark};
    color: ${C.white};
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ErrorBanner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${C.dangerLt};
  border: 1px solid #fecaca;
  color: ${C.danger};
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  animation: ${contentFade} 0.3s ease;
`;

const DismissBtn = styled.button`
  background: none;
  border: none;
  color: ${C.danger};
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0 0.25rem;
  &:hover { opacity: 0.7; }
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${C.soft};
  font-size: 0.9rem;
  padding: 2rem 0;
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${C.soft};
  font-size: 0.95rem;
  padding: 3rem 0;
  border: 1.5px dashed ${C.border};
  border-radius: 14px;
`;

const Spinner = styled.span`
  display: inline-block;
  width: ${p => p.$large ? '20px' : '12px'};
  height: ${p => p.$large ? '20px' : '12px'};
  border: 2px solid ${p => p.$large ? C.border : 'rgba(255,255,255,0.4)'};
  border-top-color: ${p => p.$large ? C.green : C.white};
  border-radius: 50%;
  animation: ${spin} 0.65s linear infinite;
  flex-shrink: 0;
`;