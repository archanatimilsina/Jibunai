import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

const API_BASE = import.meta.env.VITE_API_URL;
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

  :root {
    --bg:           #0c0e0f;
    --bg-card:      #121518;
    --bg-input:     rgba(255,255,255,0.04);
    --border:       rgba(255,255,255,0.08);
    --border-hover: rgba(255,255,255,0.18);
    --text-primary:   #edf0f4;
    --text-secondary: #7e8fa5;
    --accent:       #a78bfa;
    --accent-dim:   rgba(167,139,250,0.12);
    --accent-glow:  rgba(167,139,250,0.25);
    --danger:       #f87171;
    --danger-dim:   rgba(248,113,113,0.12);
    --gold:         #fbbf24;
    --gold-dim:     rgba(251,191,36,0.12);
    --ease:         cubic-bezier(0.23,1,0.32,1);
  }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; outline:none; }
  body {
    font-family:'DM Sans',sans-serif;
    background:var(--bg);
    color:var(--text-primary);
    -webkit-font-smoothing:antialiased;
    overflow-x:hidden;
  }
  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:var(--border-hover); }
`;


const BASE = `${API_BASE}/api`;

const DEV_TYPES = [
  'Mentorship',
  'Internship',
  'Course',
  'Fellowship',
  'Session',
  'Online Course',
];

const TYPE_META = {
  Mentorship:      { color:'#a78bfa', icon:'🧑‍🏫' },
  Internship:      { color:'#6ee7b7', icon:'💼' },
  Course:          { color:'#93c5fd', icon:'📘' },
  Fellowship:      { color:'#fbbf24', icon:'🏅' },
  Session:         { color:'#f9a8d4', icon:'🎙️' },
  'Online Course': { color:'#fb923c', icon:'💻' },
};


const BLANK = {
  name:             'Course',
  subject:          '',
  company:          '',
  duration:         '',
  certificate_image: null,
  learnings:        [],
  skills_acquired:  [],
};

export default function ProfessionalDevPage({ onBack }) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [apiError,   setApiError]   = useState('');
  const [savingId,   setSavingId]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [modal,      setModal]      = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(BLANK);
  const [formError,  setFormError]  = useState('');

  const [learningInput, setLearningInput] = useState('');
  const [skillInput,    setSkillInput]    = useState('');

  const [filterType,   setFilterType]   = useState('all');
  const [expandedId,   setExpandedId]   = useState(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${BASE}/pdListView/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.log(err)
      setApiError('Failed to load data. Check your connection.');
    } finally {
      setLoading(false);
    }
  };
  const openAdd = () => {
    setForm(BLANK);
    setLearningInput('');
    setSkillInput('');
    setFormError('');
    setEditTarget(null);
    setModal('add');
  };

  const openEdit = (item) => {
    setForm({
      name:             item.name             || 'Course',
      subject:          item.subject          || '',
      company:          item.company          || '',
      duration:         item.duration         || '',
      certificate_image: null,
      learnings:        Array.isArray(item.learnings)       ? item.learnings       : [],
      skills_acquired:  Array.isArray(item.skills_acquired) ? item.skills_acquired : [],
    });
    setLearningInput('');
    setSkillInput('');
    setFormError('');
    setEditTarget(item);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditTarget(null); setFormError(''); };

  const handleField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const addTag = (field, input, setInput) => {
    const v = input.trim();
    if (!v) return;
    setForm(prev => ({ ...prev, [field]: [...prev[field], v] }));
    setInput('');
  };
  const removeTag = (field, idx) => {
    setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    if (!form.subject.trim()) { setFormError('Subject is required.'); return false; }
    if (!form.company.trim()) { setFormError('Company/Organisation is required.'); return false; }
    if (!form.duration.trim()){ setFormError('Duration is required.'); return false; }
    return true;
  };

  const buildFormData = () => {
  const fd = new FormData();
  fd.append('name',            form.name);
  fd.append('subject',         form.subject);
  fd.append('company',         form.company);
  fd.append('duration',        form.duration);
  fd.append('learnings',       JSON.stringify(form.learnings));
  fd.append('skills_acquired', JSON.stringify(form.skills_acquired));
  if (form.certificate_image instanceof File) {
    fd.append('certificate_image', form.certificate_image);
  }
  return fd;
};

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setFormError('');
   
    try {
      const res = await fetch(`${BASE}/pdListView/`, {
  method: 'POST',
  body:   buildFormData(),  
});
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const created = await res.json();
      setItems(prev => [created, ...prev]);
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to create record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSavingId(editTarget.id);
    setFormError('');
    try {
      const res = await fetch(`${BASE}/pdDetailView/${editTarget.id}/`, {
  method: 'PATCH',
  body:   buildFormData(),
});
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const updated = await res.json();
      setItems(prev => prev.map(it => it.id === editTarget.id ? updated : it));
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to update record.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setApiError('');
    try {
      const res = await fetch(`${BASE}/pdDetailView/${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed.');
      setItems(prev => prev.filter(it => it.id !== id));
    } catch (err) {
      setApiError(err.message || 'Could not delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const visible = filterType === 'all'
    ? items
    : items.filter(it => it.name === filterType);

 
  return (
    <>
      <GlobalStyle />
      <PageWrap>

        <TopBar>
          <TopLeft>
            <BackBtn onClick={onBack}>←</BackBtn>
            <PageTitle>Professional <em>Growth</em></PageTitle>
            <CountBadge>{items.length}</CountBadge>
          </TopLeft>
          <TopRight>
            {apiError && (
              <ErrorPill>
                {apiError}
                <DismissBtn onClick={() => setApiError('')}>✕</DismissBtn>
              </ErrorPill>
            )}
            <AddBtn onClick={openAdd}>+ Add Record</AddBtn>
          </TopRight>
        </TopBar>

        <FilterRow>
          <FilterTab $active={filterType === 'all'} onClick={() => setFilterType('all')}>All</FilterTab>
          {DEV_TYPES.map(t => (
            <FilterTab key={t} $active={filterType === t} onClick={() => setFilterType(t)}>
              {TYPE_META[t]?.icon} {t}
            </FilterTab>
          ))}
        </FilterRow>

        {loading && (
          <CenterState>
            <Spinner />
            <SpinnerLabel>Loading records...</SpinnerLabel>
          </CenterState>
        )}

        {!loading && visible.length === 0 && (
          <CenterState>
            <EmptyIcon>💆‍♀️</EmptyIcon>
            <EmptyTitle>No records yet.</EmptyTitle>
            <EmptyDesc>Click "Add Record" to log your first development item.</EmptyDesc>
          </CenterState>
        )}

        {!loading && visible.length > 0 && (
          <List>
            {visible.map((item, i) => (
              <DevItem
                key={item.id}
                item={item}
                index={i}
                isDeleting={deletingId === item.id}
                isExpanded={expandedId === item.id}
                onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </List>
        )}

        {modal && (
          <ModalOverlay onClick={closeModal}>
            <ModalBox onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{modal === 'add' ? 'Add Development Record' : 'Edit Record'}</ModalTitle>
                <CloseBtn onClick={closeModal}>✕</CloseBtn>
              </ModalHeader>

              <ModalForm onSubmit={modal === 'add' ? handleCreate : handleUpdate}>

                <FieldRow>
                  <FormGroup>
                    <Label>Type *</Label>
                    <Select value={form.name} onChange={e => handleField('name', e.target.value)}>
                      {DEV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Duration *</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 3 months / 8 weeks"
                      value={form.duration}
                      onChange={e => handleField('duration', e.target.value)}
                    />
                  </FormGroup>
                </FieldRow>

                <FormGroup>
                  <Label>Subject / Course Title *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Advanced Django REST Framework"
                    value={form.subject}
                    onChange={e => handleField('subject', e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Company / Organisation *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. WLiT Nepal, Udemy, Google"
                    value={form.company}
                    onChange={e => handleField('company', e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
  <Label>Certificate Image</Label>
  <Input
    type="file"
    accept="image/*"
    onChange={e => handleField('certificate_image', e.target.files[0] || null)}
  />
  {editTarget?.certificate_image_url && (
    <img
      src={editTarget.certificate_image_url}
      alt="Current certificate"
      style={{ marginTop: '0.5rem', maxHeight: '80px', borderRadius: '8px', opacity: 0.7 }}
    />
  )}
</FormGroup>

                <FormGroup>
                  <Label>Key Learnings</Label>
                  <TagInputRow>
                    <Input
                      type="text"
                      placeholder="Add a learning and press Enter"
                      value={learningInput}
                      onChange={e => setLearningInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag('learnings', learningInput, setLearningInput);
                        }
                      }}
                    />
                    <TagAddBtn
                      type="button"
                      onClick={() => addTag('learnings', learningInput, setLearningInput)}
                    >Add</TagAddBtn>
                  </TagInputRow>
                  {form.learnings.length > 0 && (
                    <TagList>
                      {form.learnings.map((l, i) => (
                        <Tag key={i} $color="var(--accent)">
                          {l}
                          <TagRemove onClick={() => removeTag('learnings', i)}>×</TagRemove>
                        </Tag>
                      ))}
                    </TagList>
                  )}
                </FormGroup>

                <FormGroup>
                  <Label>Skills Acquired</Label>
                  <TagInputRow>
                    <Input
                      type="text"
                      placeholder="Add a skill and press Enter"
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag('skills_acquired', skillInput, setSkillInput);
                        }
                      }}
                    />
                    <TagAddBtn
                      type="button"
                      onClick={() => addTag('skills_acquired', skillInput, setSkillInput)}
                    >Add</TagAddBtn>
                  </TagInputRow>
                  {form.skills_acquired.length > 0 && (
                    <TagList>
                      {form.skills_acquired.map((s, i) => (
                        <Tag key={i} $color="var(--gold)">
                          {s}
                          <TagRemove onClick={() => removeTag('skills_acquired', i)}>×</TagRemove>
                        </Tag>
                      ))}
                    </TagList>
                  )}
                </FormGroup>

                {formError && <FormError>{formError}</FormError>}

                <ModalActions>
                  <CancelBtn type="button" onClick={closeModal}>Cancel</CancelBtn>
                  <SaveBtn type="submit" disabled={submitting || savingId !== null}>
                    {submitting || savingId !== null ? <BtnSpinner /> : modal === 'add' ? 'Save' : 'Update'}
                  </SaveBtn>
                </ModalActions>

              </ModalForm>
            </ModalBox>
          </ModalOverlay>
        )}

      </PageWrap>
    </>
  );
}

function DevItem({ item, index, isDeleting, isExpanded, onToggleExpand, onEdit, onDelete }) {
  const meta     = TYPE_META[item.name] || { color:'#a78bfa', icon:'📌' };
  const learnings = Array.isArray(item.learnings)       ? item.learnings       : [];
  const skills    = Array.isArray(item.skills_acquired) ? item.skills_acquired : [];

  return (
    <ItemWrap $delay={index * 0.055} $isDeleting={isDeleting}>
      <ItemRow onClick={onToggleExpand}>
        <ItemLeft>
          <TypeDot $color={meta.color}>{meta.icon}</TypeDot>
          <ItemInfo>
            <ItemSubject>{item.subject}</ItemSubject>
            <ItemMeta>
              <span>{item.name}</span>
              <Dot />
              <span>{item.company}</span>
              <Dot />
              <span>{item.duration}</span>
            </ItemMeta>
          </ItemInfo>
        </ItemLeft>
        <ItemRight>
          {item.certificate_link && (
            <CertLink
              href={item.certificate_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title="View Certificate"
            >
              🏆 Cert
            </CertLink>
          )}
          <ExpandIcon $expanded={isExpanded}>›</ExpandIcon>
          <IconBtn onClick={e => { e.stopPropagation(); onEdit(); }} title="Edit">✎</IconBtn>
          <IconBtn $danger onClick={e => { e.stopPropagation(); onDelete(); }} disabled={isDeleting} title="Delete">
            {isDeleting ? <BtnSpinner /> : '×'}
          </IconBtn>
        </ItemRight>
      </ItemRow>

      {isExpanded && (learnings.length > 0 || skills.length > 0) && (
        <Expanded>
          {learnings.length > 0 && (
            <ExpandSection>
              <ExpandLabel>Key Learnings</ExpandLabel>
              <ExpandTags>
                {learnings.map((l, i) => (
                  <ExpandTag key={i} $color="var(--accent)">{l}</ExpandTag>
                ))}
              </ExpandTags>
            </ExpandSection>
          )}
          {skills.length > 0 && (
            <ExpandSection>
              <ExpandLabel>Skills Acquired</ExpandLabel>
              <ExpandTags>
                {skills.map((s, i) => (
                  <ExpandTag key={i} $color="var(--gold)">{s}</ExpandTag>
                ))}
              </ExpandTags>
            </ExpandSection>
          )}
        </Expanded>
      )}
    </ItemWrap>
  );
}


const fadeUp  = keyframes`from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}`;
const spin    = keyframes`to{transform:rotate(360deg);}`;
const pulse   = keyframes`0%,100%{opacity:1;}50%{opacity:.4;}`;
const modalIn = keyframes`from{opacity:0;transform:scale(.95) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}`;
const expand  = keyframes`from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}`;


const PageWrap = styled.div`min-height:100vh;background:var(--bg);padding:0 2rem 6rem;`;


const TopBar   = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding:2rem 0 1.5rem;border-bottom:1px solid var(--border);
`;
const TopLeft  = styled.div`display:flex;align-items:center;gap:1rem;`;
const TopRight = styled.div`display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;justify-content:flex-end;`;
const BackBtn  = styled.button`
  background:var(--bg-input);border:1px solid var(--border);
  color:var(--text-secondary);width:36px;height:36px;border-radius:10px;
  cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;
  transition:all .2s;
  &:hover{border-color:var(--border-hover);color:var(--text-primary);}
`;
const PageTitle = styled.h1`
  font-family:'Syne',sans-serif;font-size:1.75rem;font-weight:800;letter-spacing:-.04em;
  em{font-style:normal;color:var(--accent);}
`;
const CountBadge = styled.span`
  background:var(--accent-dim);color:var(--accent);
  font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;
  padding:.2rem .6rem;border-radius:100px;
`;
const AddBtn = styled.button`
  background:var(--accent);color:#0c0e0f;
  font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;
  border:none;padding:.55rem 1.1rem;border-radius:10px;cursor:pointer;
  transition:all .2s;
  &:hover{filter:brightness(1.1);transform:translateY(-1px);}
`;
const ErrorPill = styled.div`
  display:flex;align-items:center;gap:.5rem;
  background:var(--danger-dim);border:1px solid rgba(248,113,113,.3);
  color:var(--danger);padding:.3rem .8rem;border-radius:100px;
  font-size:.78rem;animation:${pulse} 2s ease infinite;
`;
const DismissBtn = styled.button`
  background:none;border:none;color:var(--danger);cursor:pointer;font-size:.85rem;
  &:hover{opacity:.7;}
`;


const FilterRow = styled.div`display:flex;gap:.5rem;padding:1.25rem 0;flex-wrap:wrap;`;
const FilterTab = styled.button`
  background:${p => p.$active ? 'var(--accent-dim)' : 'var(--bg-input)'};
  border:1px solid ${p => p.$active ? 'rgba(167,139,250,.35)' : 'var(--border)'};
  color:${p => p.$active ? 'var(--accent)' : 'var(--text-secondary)'};
  font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;
  padding:.35rem .85rem;border-radius:100px;cursor:pointer;transition:all .2s;
  &:hover{border-color:var(--border-hover);color:var(--text-primary);}
`;


const CenterState  = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:55vh;gap:1rem;color:var(--text-secondary);
`;
const Spinner      = styled.div`
  width:28px;height:28px;border:2px solid var(--border);
  border-top-color:var(--accent);border-radius:50%;
  animation:${spin} .7s linear infinite;
`;
const SpinnerLabel = styled.p`font-size:.9rem;`;
const EmptyIcon    = styled.div`font-size:2.5rem;`;
const EmptyTitle   = styled.h3`font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:700;color:var(--text-primary);`;
const EmptyDesc    = styled.p`font-size:.875rem;`;


const List = styled.div`display:flex;flex-direction:column;gap:.75rem;padding-top:.5rem;`;


const ItemWrap = styled.div`
  background:var(--bg-card);border:1px solid var(--border);border-radius:14px;
  overflow:hidden;
  opacity:${p => p.$isDeleting ? .4 : 1};
  pointer-events:${p => p.$isDeleting ? 'none' : 'auto'};
  animation:${fadeUp} .45s var(--ease) both;
  animation-delay:${p => p.$delay}s;
  transition:border-color .2s;
  &:hover{border-color:var(--border-hover);}
`;
const ItemRow = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding:1.1rem 1.25rem;cursor:pointer;gap:1rem;
`;
const ItemLeft   = styled.div`display:flex;align-items:center;gap:1rem;flex:1;min-width:0;`;
const TypeDot    = styled.div`
  width:38px;height:38px;border-radius:10px;flex-shrink:0;
  background:${p => p.$color}18;border:1px solid ${p => p.$color}30;
  display:flex;align-items:center;justify-content:center;font-size:1rem;
`;
const ItemInfo   = styled.div`min-width:0;`;
const ItemSubject = styled.div`
  font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700;
  color:var(--text-primary);letter-spacing:-.01em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
`;
const ItemMeta   = styled.div`
  display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;
  margin-top:.2rem;font-size:.76rem;color:var(--text-secondary);
`;
const Dot        = styled.span`
  width:3px;height:3px;border-radius:50%;background:var(--text-secondary);opacity:.4;
`;
const ItemRight  = styled.div`display:flex;align-items:center;gap:.4rem;flex-shrink:0;`;
const CertLink   = styled.a`
  font-family:'Syne',sans-serif;font-size:.68rem;font-weight:700;
  color:var(--gold);background:var(--gold-dim);
  border:1px solid rgba(251,191,36,.25);
  padding:.2rem .55rem;border-radius:100px;text-decoration:none;
  transition:all .2s;white-space:nowrap;
  &:hover{filter:brightness(1.15);}
`;
const ExpandIcon = styled.span`
  color:var(--text-secondary);font-size:1.1rem;
  display:inline-block;transition:transform .25s var(--ease);
  transform:${p => p.$expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
`;
const IconBtn    = styled.button`
  background:none;border:none;
  color:${p => p.$danger ? 'var(--danger)' : 'var(--text-secondary)'};
  font-size:1rem;cursor:${p => p.disabled ? 'not-allowed' : 'pointer'};
  width:28px;height:28px;border-radius:6px;
  display:flex;align-items:center;justify-content:center;
  transition:all .2s;opacity:${p => p.disabled ? .4 : 1};
  &:hover:not(:disabled){
    background:${p => p.$danger ? 'var(--danger-dim)' : 'var(--bg-input)'};
    color:${p => p.$danger ? 'var(--danger)' : 'var(--text-primary)'};
  }
`;


const Expanded = styled.div`
  padding:0 1.25rem 1.1rem;display:flex;flex-direction:column;gap:.75rem;
  animation:${expand} .25s var(--ease) forwards;
  border-top:1px solid var(--border);padding-top:.9rem;
`;
const ExpandSection = styled.div`display:flex;flex-direction:column;gap:.4rem;`;
const ExpandLabel   = styled.div`
  font-family:'Syne',sans-serif;font-size:.6rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.1em;color:var(--text-secondary);
`;
const ExpandTags = styled.div`display:flex;flex-wrap:wrap;gap:.4rem;`;
const ExpandTag  = styled.span`
  font-size:.75rem;font-weight:500;
  color:${p => p.$color};
  background:${p => p.$color}14;
  border:1px solid ${p => p.$color}28;
  padding:.18rem .55rem;border-radius:100px;
`;


const ModalOverlay = styled.div`
  position:fixed;inset:0;background:rgba(0,0,0,.75);
  backdrop-filter:blur(6px);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:1.5rem;
`;
const ModalBox = styled.div`
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:20px;width:100%;max-width:580px;max-height:90vh;
  overflow-y:auto;animation:${modalIn} .3s var(--ease) forwards;
`;
const ModalHeader = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding:1.5rem 1.75rem 1rem;border-bottom:1px solid var(--border);
`;
const ModalTitle  = styled.h2`font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;`;
const CloseBtn    = styled.button`
  background:var(--bg-input);border:1px solid var(--border);color:var(--text-secondary);
  width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.9rem;
  display:flex;align-items:center;justify-content:center;transition:all .2s;
  &:hover{color:var(--text-primary);border-color:var(--border-hover);}
`;
const ModalForm   = styled.form`display:flex;flex-direction:column;gap:1.1rem;padding:1.5rem 1.75rem;`;
const FieldRow    = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:1rem;`;
const FormGroup   = styled.div`display:flex;flex-direction:column;gap:.4rem;`;
const Label       = styled.label`
  font-family:'Syne',sans-serif;font-size:.68rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary);
`;
const inputBase = `
  background:var(--bg-input);
  border:1px solid var(--border);
  color:var(--text-primary);
  font-family:'DM Sans',sans-serif;
  font-size:.9rem;
  border-radius:10px;
  padding:.65rem .9rem;
  transition:border-color .2s,box-shadow .2s;
  width:100%;
  &:focus{border-color:rgba(167,139,250,.5);box-shadow:0 0 0 3px rgba(167,139,250,.08);}
  &::placeholder{color:var(--text-secondary);opacity:.5;}
`;
const Input    = styled.input`${inputBase}`;
const Select   = styled.select`${inputBase}option{background:var(--bg-card);}`;
const TagInputRow = styled.div`display:flex;gap:.5rem;`;
const TagAddBtn   = styled.button`
  background:var(--accent-dim);border:1px solid rgba(167,139,250,.3);
  color:var(--accent);font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;
  padding:.65rem 1rem;border-radius:10px;cursor:pointer;transition:all .2s;white-space:nowrap;
  &:hover{background:rgba(167,139,250,.22);}
`;
const TagList   = styled.div`display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem;`;
const Tag       = styled.span`
  display:inline-flex;align-items:center;gap:.35rem;
  color:${p => p.$color};background:${p => p.$color}14;border:1px solid ${p => p.$color}28;
  font-size:.75rem;font-weight:500;padding:.2rem .55rem;border-radius:100px;
`;
const TagRemove = styled.button`
  background:none;border:none;cursor:pointer;font-size:.85rem;line-height:1;
  opacity:.7;padding:0;color:inherit;
  &:hover{opacity:1;}
`;
const FormError = styled.p`
  color:var(--danger);font-size:.82rem;
  background:var(--danger-dim);border:1px solid rgba(248,113,113,.2);
  padding:.5rem .8rem;border-radius:8px;
`;
const ModalActions = styled.div`display:flex;justify-content:flex-end;gap:.75rem;padding-top:.25rem;`;
const CancelBtn    = styled.button`
  background:none;border:1px solid var(--border);color:var(--text-secondary);
  font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;
  padding:.6rem 1.2rem;border-radius:10px;cursor:pointer;transition:all .2s;
  &:hover{border-color:var(--border-hover);color:var(--text-primary);}
`;
const SaveBtn = styled.button`
  background:var(--accent);color:#0c0e0f;
  font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;
  border:none;padding:.6rem 1.4rem;border-radius:10px;cursor:pointer;
  display:inline-flex;align-items:center;gap:.5rem;transition:all .2s;
  &:hover:not(:disabled){filter:brightness(1.1);}
  &:disabled{background:var(--bg-input);color:var(--text-secondary);border:1px solid var(--border);cursor:not-allowed;}
`;
const BtnSpinner = styled.span`
  display:inline-block;width:12px;height:12px;
  border:2px solid rgba(0,0,0,.3);border-top-color:#0c0e0f;
  border-radius:50%;animation:${spin} .65s linear infinite;
`;