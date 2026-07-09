import React, { useState, useEffect, useRef } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
const API_BASE = import.meta.env.VITE_API_URL;
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  :root {
    --bg-dark:    #090B10;
    --bg-panel:   #11141D;
    --bg-input:   rgba(255,255,255,0.03);
    --border:     rgba(255,255,255,0.08);
    --text-primary:   #F1F5F9;
    --text-secondary: #94A3B8;
    --accent:     #14B8A6;
    --accent-glow:rgba(20,184,166,0.3);
    --danger:     #EF4444;
    --success:    #10B981;
    --ease:       cubic-bezier(0.23,1,0.32,1);
  }

  *{box-sizing:border-box;margin:0;padding:0;outline:none;}
  body{font-family:'Inter',sans-serif;background-color:var(--bg-dark);color:var(--text-primary);-webkit-font-smoothing:antialiased;overflow-x:hidden;height:100vh;}
  ::-webkit-scrollbar{width:6px;height:6px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
  ::-webkit-scrollbar-thumb:hover{background:var(--text-secondary);}
`;


const BASE_URL = `${API_BASE}/api`;


const today = () => new Date().toISOString().split('T')[0];

const formatDisplayDate = (dateStr) => {
  const opts = { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' };
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(undefined, opts);
};


export default function ChronosTaskFlow() {
  const [allTasks,   setAllTasks]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [apiError,   setApiError]   = useState('');
  const [savingId,   setSavingId]   = useState(null); 
  const [submitting, setSubmitting] = useState(false);

  const [taskInput, setTaskInput] = useState('');
  const [dateInput, setDateInput] = useState(today());

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${BASE_URL}/tasks/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setAllTasks(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.log(err)
      setApiError('Failed to load tasks. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskInput.trim() || !dateInput) return;

    setSubmitting(true);
    setApiError('');
    try {
      const res = await fetch(`${BASE_URL}/tasks/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: taskInput.trim(), dueDate: dateInput, completed: false }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const created = await res.json();
      setAllTasks(prev => [created, ...prev]);
      setTaskInput('');
    } catch (err) {
      setApiError(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTask = async (task) => {
    setSavingId(task.id);
    setApiError('');
    try {
      const res = await fetch(`${BASE_URL}/tasks/${task.id}/`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error('Toggle failed.');
      const updated = await res.json();
      setAllTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch (err) {
      setApiError(err.message || 'Could not update task.');
    } finally {
      setSavingId(null);
    }
  };

  const editTask = async (task, newText) => {
    if (!newText.trim()) return;
    setSavingId(task.id);
    setApiError('');
    try {
      const res = await fetch(`${BASE_URL}/tasks/${task.id}/`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: newText.trim(), dueDate: task.dueDate, completed: task.completed }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const updated = await res.json();
      setAllTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch (err) {
      setApiError(err.message || 'Failed to update task.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteTask = async (taskId) => {
    setSavingId(taskId);
    setApiError('');
    try {
      const res = await fetch(`${BASE_URL}/tasks/${taskId}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed.');
      setAllTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      setApiError(err.message || 'Could not delete task.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteDay = async (dateStr) => {
    const dayTasks = allTasks.filter(t => t.dueDate === dateStr);
    setAllTasks(prev => prev.filter(t => t.dueDate !== dateStr));
    try {
      await Promise.all(
        dayTasks.map(t =>
          fetch(`${BASE_URL}/tasks/${t.id}/`, { method: 'DELETE' })
        )
      );
    } catch (err) {
      console.log(err)
      setApiError('Day deletion partially failed. Refreshing...');
      fetchTasks();
    }
  };

  const getVisibleDayGroups = () => {
    const grouped = allTasks.reduce((groups, task) => {
      const d = task.dueDate;
      if (!groups[d]) groups[d] = [];
      groups[d].push(task);
      return groups;
    }, {});

    return Object.keys(grouped)
      .filter(date => grouped[date].some(t => !t.completed))
      .sort((a, b) => new Date(a) - new Date(b))
      .map(date => ({
        date,
        displayDate: formatDisplayDate(date),
        tasks: grouped[date].sort(
          (a, b) => a.completed - b.completed || new Date(b.createdAt) - new Date(a.createdAt)
        ),
      }));
  };

  const visibleDayGroups = getVisibleDayGroups();
  const pendingCount     = allTasks.filter(t => !t.completed).length;

 
  return (
    <>
      <GlobalStyle />
      <AppWrapper>

       
        <Header>
          <Brand>Chronos <em>TaskFlow</em></Brand>
          <HeaderRight>
            {apiError && (
              <ErrorPill>
                {apiError}
                <DismissX onClick={() => setApiError('')}>✕</DismissX>
              </ErrorPill>
            )}
            <StatusOverview>
              Active Pipeline: <span>{pendingCount} Pending</span>
            </StatusOverview>
          </HeaderRight>
        </Header>

        
        {loading && (
          <CenteredState>
            <LoadSpinner />
            <p>Loading pipeline...</p>
          </CenteredState>
        )}

     
        {!loading && visibleDayGroups.length === 0 && (
          <EmptyState>
            <h3>All pipelines clear.</h3>
            <p>Your timeline is empty. Use the control bar below to inject a new task.</p>
          </EmptyState>
        )}

       
        {!loading && visibleDayGroups.length > 0 && (
          <TimelineGrid>
            {visibleDayGroups.map(dayGroup => (
              <DayColumn
                key={dayGroup.date}
                dayGroup={dayGroup}
                savingId={savingId}
                onToggle={toggleTask}
                onEdit={editTask}
                onDelete={deleteTask}
                onDeleteDay={deleteDay}
              />
            ))}
            <div style={{ minWidth: '300px', height: '1px' }} />
          </TimelineGrid>
        )}

       
        <ControlBar onSubmit={handleAddTask}>
          <InputGroup>
            <TaskInput
              type="text"
              placeholder="Inject new objective..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              disabled={submitting}
            />
            <DateInput
              type="date"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              disabled={submitting}
            />
            <SubmitButton type="submit" disabled={!taskInput.trim() || submitting}>
              {submitting ? <BtnSpinner /> : 'Archive Objective'}
            </SubmitButton>
          </InputGroup>
        </ControlBar>

      </AppWrapper>
    </>
  );
}


function DayColumn({ dayGroup, savingId, onToggle, onEdit, onDelete, onDeleteDay }) {
  const total     = dayGroup.tasks.length;
  const completed = dayGroup.tasks.filter(t => t.completed).length;
  const progress  = total > 0 ? (completed / total) * 100 : 0;

  return (
    <ColumnWrapper>
      <ColumnHeader>
        <DateHeader>
          {dayGroup.displayDate}
          {dayGroup.date === today() && <TodayBadge>Today</TodayBadge>}
        </DateHeader>
        <ColumnActions>
          <TaskCount>{completed} / {total} Done</TaskCount>
          <DeleteDayBtn onClick={() => onDeleteDay(dayGroup.date)} title="Delete Day Pipeline">×</DeleteDayBtn>
        </ColumnActions>
        <ProgressBar>
          <ProgressFill $percent={progress} />
        </ProgressBar>
      </ColumnHeader>

      <TaskFeed>
        {dayGroup.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            isSaving={savingId === task.id}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TaskFeed>
    </ColumnWrapper>
  );
}


function TaskCard({ task, isSaving, onToggle, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText,  setEditText]  = useState(task.text);
  const inputRef = useRef(null);

  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

  const handleEditSubmit = () => {
    onEdit(task, editText);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleEditSubmit();
    if (e.key === 'Escape') { setEditText(task.text); setIsEditing(false); }
  };

  return (
    <Card $isCompleted={task.completed} $isSaving={isSaving}>
      <CardMain>
        <CustomCheckbox
          checked={task.completed}
          onClick={() => !isSaving && onToggle(task)}
          title={task.completed ? 'Mark Pending' : 'Mark Complete'}
          disabled={isSaving}
        >
          {isSaving ? <MiniSpinner /> : null}
        </CustomCheckbox>

        {isEditing ? (
          <InlineEditInput
            ref={inputRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
          />
        ) : (
          <TaskText $isCompleted={task.completed} onDoubleClick={() => !isSaving && setIsEditing(true)}>
            {task.text}
          </TaskText>
        )}
      </CardMain>

      <CardActions className="card-actions">
        {!task.completed && !isEditing && (
          <ActionButton onClick={() => setIsEditing(true)} title="Edit" disabled={isSaving}>✎</ActionButton>
        )}
        <ActionButton
          onClick={() => onDelete(task.id)}
          color="var(--danger)"
          title="Delete"
          disabled={isSaving}
        >×</ActionButton>
      </CardActions>
    </Card>
  );
}


const fadeInColumn = keyframes`from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}`;
const spin         = keyframes`to{transform:rotate(360deg);}`;
const pulse        = keyframes`0%,100%{opacity:1;}50%{opacity:.4;}`;


const AppWrapper = styled.div`height:100vh;display:flex;flex-direction:column;padding:0 2rem;`;

const Header = styled.header`
  display:flex;justify-content:space-between;align-items:center;
  padding:2rem 0;border-bottom:1px solid var(--border);flex-shrink:0;
`;
const Brand = styled.h1`
  font-size:1.5rem;font-weight:800;letter-spacing:-.05em;
  em{font-style:normal;color:var(--accent);font-weight:400;}
`;
const HeaderRight    = styled.div`display:flex;align-items:center;gap:1rem;flex-wrap:wrap;justify-content:flex-end;`;
const StatusOverview = styled.p`font-size:.9rem;color:var(--text-secondary);span{color:var(--text-primary);font-weight:600;padding-left:.5rem;}`;

const ErrorPill = styled.div`
  display:flex;align-items:center;gap:.5rem;
  background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);
  color:#EF4444;padding:.35rem .85rem;border-radius:100px;font-size:.78rem;
  animation:${pulse} 2s ease infinite;
`;
const DismissX = styled.button`background:none;border:none;color:#EF4444;cursor:pointer;font-size:.9rem;line-height:1;&:hover{opacity:.7;}`;

const CenteredState = styled.div`
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:1rem;color:var(--text-secondary);padding-bottom:10rem;
`;
const LoadSpinner = styled.span`
  display:inline-block;width:24px;height:24px;
  border:2px solid var(--border);border-top-color:var(--accent);
  border-radius:50%;animation:${spin} .7s linear infinite;
`;
const BtnSpinner = styled.span`
  display:inline-block;width:14px;height:14px;
  border:2px solid rgba(0,0,0,.3);border-top-color:var(--bg-dark);
  border-radius:50%;animation:${spin} .65s linear infinite;
`;
const MiniSpinner = styled.span`
  display:inline-block;width:10px;height:10px;
  border:1.5px solid rgba(255,255,255,.2);border-top-color:var(--accent);
  border-radius:50%;animation:${spin} .65s linear infinite;
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
`;

const TimelineGrid = styled.main`
  flex:1;display:flex;gap:1.5rem;padding:2rem 0 10rem;
  overflow-x:auto;align-items:flex-start;
  >div{animation:${fadeInColumn} 0.5s var(--ease) forwards;}
`;
const EmptyState = styled.div`
  flex:1;display:flex;flex-direction:column;justify-content:center;
  align-items:center;text-align:center;gap:1rem;
  color:var(--text-secondary);padding-bottom:10rem;
  h3{color:var(--text-primary);font-size:1.5rem;margin-bottom:.5rem;}
  p{max-width:400px;line-height:1.6;}
`;

const ColumnWrapper = styled.div`
  min-width:320px;max-width:320px;
  background-color:var(--bg-panel);border:1px solid var(--border);
  border-radius:12px;display:flex;flex-direction:column;
  max-height:100%;box-shadow:0 10px 30px rgba(0,0,0,.2);flex-shrink:0;
`;
const ColumnHeader  = styled.header`padding:1.25rem;border-bottom:1px solid var(--border);position:relative;flex-shrink:0;`;
const DateHeader    = styled.h3`font-size:1rem;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem;`;
const TodayBadge    = styled.span`background-color:var(--accent);color:var(--bg-dark);font-size:.7rem;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;letter-spacing:.05em;`;
const ColumnActions = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;`;
const TaskCount     = styled.span`font-size:.8rem;color:var(--text-secondary);font-weight:500;`;
const DeleteDayBtn  = styled.button`background:none;border:none;color:var(--text-secondary);font-size:1.2rem;cursor:pointer;transition:color .2s;line-height:1;&:hover{color:var(--danger);}`;
const ProgressBar   = styled.div`height:4px;background-color:var(--bg-dark);border-radius:2px;overflow:hidden;`;
const ProgressFill  = styled.div`height:100%;background-color:var(--success);transition:width .4s var(--ease);width:${p => p.$percent}%;`;
const TaskFeed      = styled.div`padding:1rem;display:flex;flex-direction:column;gap:.75rem;overflow-y:auto;flex:1;`;

const Card = styled.div`
  background-color:${p => p.$isCompleted ? 'rgba(255,255,255,0.01)' : 'var(--bg-input)'};
  border:1px solid ${p => p.$isCompleted ? 'transparent' : 'var(--border)'};
  border-radius:8px;padding:1rem;
  display:flex;justify-content:space-between;align-items:center;gap:1rem;
  transition:all .3s var(--ease);flex-shrink:0;
  opacity:${p => p.$isSaving ? .55 : 1};
  &:hover{
    border-color:${p => p.$isCompleted ? 'transparent' : 'var(--text-secondary)'};
    background-color:${p => p.$isCompleted ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'};
    .card-actions{opacity:1;transform:translateX(0);}
  }
`;
const CardMain    = styled.div`display:flex;align-items:center;gap:.75rem;flex:1;`;
const CustomCheckbox = styled.button`
  width:20px;height:20px;border-radius:6px;
  border:2px solid ${p => p.checked ? 'var(--success)' : 'var(--text-secondary)'};
  background-color:${p => p.checked ? 'var(--success)' : 'transparent'};
  cursor:${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition:all .2s;position:relative;flex-shrink:0;
  &:hover:not(:disabled){border-color:${p => p.checked ? 'var(--success)' : 'var(--accent)'};}
  &::after{
    content:'✓';position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);
    color:var(--bg-dark);font-size:12px;font-weight:900;
    opacity:${p => p.checked ? 1 : 0};transition:opacity .2s;
  }
`;
const TaskText = styled.p`
  font-size:.9rem;font-weight:500;line-height:1.5;word-break:break-word;cursor:pointer;
  color:${p => p.$isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)'};
  text-decoration:${p => p.$isCompleted ? 'line-through' : 'none'};
  transition:color .2s;
`;
const InlineEditInput = styled.input`
  flex:1;background:none;border:none;
  font-family:inherit;font-size:.9rem;font-weight:500;
  color:var(--accent);border-bottom:1px dashed var(--accent);padding:2px 0;
`;
const CardActions = styled.div`
  display:flex;gap:.5rem;opacity:0;transform:translateX(10px);
  transition:all .3s var(--ease);flex-shrink:0;
`;
const ActionButton = styled.button`
  background:none;border:none;
  color:${p => p.color || 'var(--text-secondary)'};
  font-size:1.1rem;cursor:${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition:color .2s,transform .2s;line-height:1;
  opacity:${p => p.disabled ? .4 : 1};
  &:hover:not(:disabled){color:var(--text-primary);transform:scale(1.1);}
`;

const ControlBar = styled.form`
  position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
  width:calc(100% - 4rem);max-width:800px;
  background:rgba(17,20,29,.6);backdrop-filter:blur(20px) saturate(180%);
  -webkit-backdrop-filter:blur(20px) saturate(180%);
  border:1px solid var(--border);border-radius:50px;padding:.75rem;
  box-shadow:0 20px 50px rgba(0,0,0,.4);z-index:100;
`;
const InputGroup = styled.div`display:flex;align-items:center;gap:.75rem;`;
const BaseInput  = styled.input`
  background-color:var(--bg-input);border:1px solid var(--border);
  color:var(--text-primary);font-family:inherit;font-size:.9rem;
  transition:all .3s var(--ease);
  &:focus{border-color:var(--accent);background-color:rgba(255,255,255,.05);box-shadow:0 0 15px var(--accent-glow);}
  &:disabled{opacity:.5;cursor:not-allowed;}
`;
const TaskInput  = styled(BaseInput)`flex:1;padding:1rem 1.5rem;border-radius:30px;font-weight:500;`;
const DateInput  = styled(BaseInput)`padding:1rem;border-radius:30px;width:160px;color-scheme:dark;`;
const SubmitButton = styled.button`
  background-color:var(--accent);color:var(--bg-dark);border:none;
  padding:1rem 1.75rem;border-radius:30px;font-size:.9rem;font-weight:700;
  cursor:pointer;transition:all .3s var(--ease);white-space:nowrap;
  display:inline-flex;align-items:center;gap:.5rem;
  &:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 5px 20px var(--accent-glow);}
  &:active:not(:disabled){transform:translateY(1px);}
  &:disabled{background-color:var(--bg-panel);color:var(--text-secondary);border:1px solid var(--border);cursor:not-allowed;}
`;