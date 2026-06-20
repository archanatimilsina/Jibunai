import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

const API_BASE = import.meta.env.VITE_API_URL;
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

  :root {
    --bg:          #0d0f14;
    --bg-card:     #13161f;
    --bg-input:    rgba(255,255,255,0.04);
    --border:      rgba(255,255,255,0.08);
    --border-hover:rgba(255,255,255,0.18);
    --text-primary:   #eef0f6;
    --text-secondary: #8892a4;
    --accent:      #6ee7b7;
    --accent-dim:  rgba(110,231,183,0.12);
    --accent-glow: rgba(110,231,183,0.25);
    --danger:      #f87171;
    --danger-dim:  rgba(248,113,113,0.12);
    --gold:        #fbbf24;
    --ease:        cubic-bezier(0.23,1,0.32,1);
  }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; outline:none; }
  body {
    font-family:'DM Sans',sans-serif;
    background:var(--bg);
    color:var(--text-primary);
    -webkit-font-smoothing:antialiased;
    overflow-x:hidden;
  }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:var(--border-hover); }
`;


const BASE = `${API_BASE}/api`;


const TYPE_OPTS = [
  { value:'solo',        label:'Solo'        },
  { value:'group',       label:'Group'       },
  { value:'academic',    label:'Academic'    },
  { value:'open_source', label:'Open Source' },
];


const BLANK = {
  name: '',
  tech: '',
  project_type: 'solo',
  description: '',
  tech_stack: {},
  features: [],
  github_link: '',
};


export default function ProjectsPage({ onBack }) {
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [apiError,   setApiError]   = useState('');
  const [savingId,   setSavingId]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [modal,       setModal]       = useState(null);
  const [editTarget,  setEditTarget]  = useState(null);  
  const [form,        setForm]        = useState(BLANK);
  const [formError,   setFormError]   = useState('');

  const [featureInput, setFeatureInput] = useState('');

  const [filterType, setFilterType] = useState('all');
  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${BASE}/projectListView/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.log(err)
      setApiError('Failed to load projects. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(BLANK);
    setFeatureInput('');
    setFormError('');
    setEditTarget(null);
    setModal('add');
  };

  const openEdit = (project) => {
    setForm({
      name:         project.name         || '',
      tech:         project.tech         || '',
      project_type: project.project_type || 'solo',
      description:  project.description  || '',
      tech_stack:   project.tech_stack   || {},
      features:     project.features     || [],
      github_link:  project.github_link  || '',
    });
    setFeatureInput('');
    setFormError('');
    setEditTarget(project);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditTarget(null); setFormError(''); };

  const handleField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const addFeature = () => {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    setForm(prev => ({ ...prev, features: [...prev.features, trimmed] }));
    setFeatureInput('');
  };
  const removeFeature = (idx) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    if (!form.name.trim())  { setFormError('Project name is required.'); return false; }
    if (!form.tech.trim())  { setFormError('Tech field is required.');   return false; }
    return true;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`${BASE}/projectListView/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const created = await res.json();
      setProjects(prev => [created, ...prev]);
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to create project.');
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
      const res = await fetch(`${BASE}/projectDetailView/${editTarget.id}/`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Object.values(errData).flat().join(' — '));
      }
      const updated = await res.json();
      setProjects(prev => prev.map(p => p.id === editTarget.id ? updated : p));
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to update project.');
    } finally {
      setSavingId(null);
    }
  };


  const handleDelete = async (id) => {
    setDeletingId(id);
    setApiError('');
    try {
      const res = await fetch(`${BASE}/projectDetailView/${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed.');
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setApiError(err.message || 'Could not delete project.');
    } finally {
      setDeletingId(null);
    }
  };

  const visible = filterType === 'all'
    ? projects
    : projects.filter(p => p.project_type === filterType);

  return (
    <>
      <GlobalStyle />
      <PageWrap>

        <TopBar>
          <TopLeft>
            <BackBtn onClick={onBack}>←</BackBtn>
            <PageTitle>Projects<em>.</em></PageTitle>
            <CountBadge>{projects.length}</CountBadge>
          </TopLeft>
          <TopRight>
            {apiError && (
              <ErrorPill>
                {apiError}
                <DismissBtn onClick={() => setApiError('')}>✕</DismissBtn>
              </ErrorPill>
            )}
            <AddBtn onClick={openAdd}>+ New Project</AddBtn>
          </TopRight>
        </TopBar>

        <FilterRow>
          <FilterTab $active={filterType === 'all'} onClick={() => setFilterType('all')}>All</FilterTab>
          {TYPE_OPTS.map(o => (
            <FilterTab key={o.value} $active={filterType === o.value} onClick={() => setFilterType(o.value)}>
              {o.label}
            </FilterTab>
          ))}
        </FilterRow>

        {loading && (
          <CenterState>
            <Spinner />
            <SpinnerLabel>Loading projects...</SpinnerLabel>
          </CenterState>
        )}

        {!loading && visible.length === 0 && (
          <CenterState>
            <EmptyIcon>👩‍💻</EmptyIcon>
            <EmptyTitle>No projects yet.</EmptyTitle>
            <EmptyDesc>Click "New Project" to add your first one.</EmptyDesc>
          </CenterState>
        )}

        {!loading && visible.length > 0 && (
          <Grid>
            {visible.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                isDeleting={deletingId === project.id}
                onEdit={() => openEdit(project)}
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </Grid>
        )}

        {modal && (
          <ModalOverlay onClick={closeModal}>
            <ModalBox onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{modal === 'add' ? 'New Project' : 'Edit Project'}</ModalTitle>
                <CloseBtn onClick={closeModal}>✕</CloseBtn>
              </ModalHeader>

              <ModalForm onSubmit={modal === 'add' ? handleCreate : handleUpdate}>

                <FieldRow>
                  <FormGroup>
                    <Label>Project Name *</Label>
                    <Input
                      type="text"
                      placeholder="e.g. TaskSphere"
                      value={form.name}
                      onChange={e => handleField('name', e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Type</Label>
                    <Select value={form.project_type} onChange={e => handleField('project_type', e.target.value)}>
                      {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </FormGroup>
                </FieldRow>

                <FormGroup>
                  <Label>Tech (short summary) *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Django · React · PostgreSQL"
                    value={form.tech}
                    onChange={e => handleField('tech', e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    placeholder="What does this project do?"
                    value={form.description}
                    onChange={e => handleField('description', e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>GitHub Link</Label>
                  <Input
                    type="url"
                    placeholder="https://github.com/..."
                    value={form.github_link}
                    onChange={e => handleField('github_link', e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Features</Label>
                  <TagInputRow>
                    <Input
                      type="text"
                      placeholder="Add a feature and press Enter"
                      value={featureInput}
                      onChange={e => setFeatureInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                    />
                    <TagAddBtn type="button" onClick={addFeature}>Add</TagAddBtn>
                  </TagInputRow>
                  {form.features.length > 0 && (
                    <TagList>
                      {form.features.map((f, i) => (
                        <Tag key={i}>
                          {f}
                          <TagRemove onClick={() => removeFeature(i)}>×</TagRemove>
                        </Tag>
                      ))}
                    </TagList>
                  )}
                </FormGroup>

                {formError && <FormError>{formError}</FormError>}

                <ModalActions>
                  <CancelBtn type="button" onClick={closeModal}>Cancel</CancelBtn>
                  <SaveBtn type="submit" disabled={submitting || savingId !== null}>
                    {submitting || savingId !== null ? <BtnSpinner /> : modal === 'add' ? 'Create' : 'Save'}
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

function ProjectCard({ project, index, isDeleting, onEdit, onDelete }) {
  const typeColor = {
    solo:        '#6ee7b7',
    group:       '#93c5fd',
    academic:    '#fbbf24',
    open_source: '#f9a8d4',
  }[project.project_type] || '#6ee7b7';

  const features = Array.isArray(project.features) ? project.features : [];

  return (
    <Card $delay={index * 0.06} $isDeleting={isDeleting}>
      <CardTop>
        <TypeBadge $color={typeColor}>
          {TYPE_OPTS.find(o => o.value === project.project_type)?.label || project.project_type}
        </TypeBadge>
        <CardActions>
          <IconBtn onClick={onEdit} title="Edit">✎</IconBtn>
          <IconBtn $danger onClick={onDelete} disabled={isDeleting} title="Delete">
            {isDeleting ? <BtnSpinner /> : '×'}
          </IconBtn>
        </CardActions>
      </CardTop>

      <CardName>{project.name}</CardName>
      <CardTech>{project.tech}</CardTech>

      {project.description && (
        <CardDesc>{project.description}</CardDesc>
      )}

      {features.length > 0 && (
        <FeatureList>
          {features.slice(0, 4).map((f, i) => (
            <FeatureItem key={i}>◈ {f}</FeatureItem>
          ))}
          {features.length > 4 && (
            <FeatureItem $muted>+{features.length - 4} more</FeatureItem>
          )}
        </FeatureList>
      )}

      <CardFooter>
        {project.github_link ? (
          <GithubLink href={project.github_link} target="_blank" rel="noopener noreferrer">
            ↗ GitHub
          </GithubLink>
        ) : (
          <GithubLink as="span" $muted>No repo linked</GithubLink>
        )}
        <CardDate>
          {project.created_at
            ? new Date(project.created_at).toLocaleDateString(undefined, { month:'short', year:'numeric' })
            : ''}
        </CardDate>
      </CardFooter>
    </Card>
  );
}


const fadeUp  = keyframes`from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}`;
const spin    = keyframes`to{transform:rotate(360deg);}`;
const pulse   = keyframes`0%,100%{opacity:1;}50%{opacity:.4;}`;
const modalIn = keyframes`from{opacity:0;transform:scale(.95) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}`;


const PageWrap = styled.div`
  min-height:100vh;
  background:var(--bg);
  padding:0 2rem 6rem;
`;


const TopBar   = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding:2rem 0 1.5rem;
  border-bottom:1px solid var(--border);
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
  padding:.2rem .6rem;border-radius:100px;letter-spacing:.05em;
`;
const AddBtn = styled.button`
  background:var(--accent);color:#0d0f14;
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

const FilterRow = styled.div`
  display:flex;gap:.5rem;padding:1.25rem 0;flex-wrap:wrap;
`;
const FilterTab = styled.button`
  background:${p => p.$active ? 'var(--accent-dim)' : 'var(--bg-input)'};
  border:1px solid ${p => p.$active ? 'rgba(110,231,183,.35)' : 'var(--border)'};
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


const Grid = styled.div`
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));
  gap:1.25rem;
  padding-top:.5rem;
`;


const Card = styled.div`
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:16px;
  padding:1.5rem;
  display:flex;flex-direction:column;gap:.85rem;
  opacity:${p => p.$isDeleting ? .4 : 1};
  pointer-events:${p => p.$isDeleting ? 'none' : 'auto'};
  animation:${fadeUp} .5s var(--ease) both;
  animation-delay:${p => p.$delay}s;
  transition:border-color .2s,box-shadow .2s,transform .2s;
  &:hover{
    border-color:var(--border-hover);
    box-shadow:0 12px 40px rgba(0,0,0,.3);
    transform:translateY(-2px);
  }
`;
const CardTop    = styled.div`display:flex;justify-content:space-between;align-items:center;`;
const TypeBadge  = styled.span`
  font-family:'Syne',sans-serif;font-size:.65rem;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;
  color:${p => p.$color};
  background:${p => p.$color}18;
  border:1px solid ${p => p.$color}38;
  padding:.22rem .65rem;border-radius:100px;
`;
const CardActions = styled.div`display:flex;gap:.4rem;`;
const IconBtn = styled.button`
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
const CardName   = styled.h2`
  font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
  letter-spacing:-.02em;color:var(--text-primary);line-height:1.2;
`;
const CardTech   = styled.p`
  font-size:.8rem;color:var(--accent);font-weight:500;letter-spacing:.02em;
`;
const CardDesc   = styled.p`
  font-size:.855rem;color:var(--text-secondary);line-height:1.65;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
`;
const FeatureList = styled.ul`list-style:none;display:flex;flex-direction:column;gap:.35rem;`;
const FeatureItem = styled.li`
  font-size:.8rem;
  color:${p => p.$muted ? 'var(--text-secondary)' : 'var(--text-primary)'};
  opacity:${p => p.$muted ? .6 : .85};
`;
const CardFooter = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding-top:.75rem;border-top:1px solid var(--border);margin-top:auto;
`;
const GithubLink = styled.a`
  font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;
  color:${p => p.$muted ? 'var(--text-secondary)' : 'var(--accent)'};
  text-decoration:none;opacity:${p => p.$muted ? .5 : 1};
  &:hover{text-decoration:${p => p.$muted ? 'none' : 'underline'};}
`;
const CardDate = styled.span`font-size:.72rem;color:var(--text-secondary);opacity:.6;`;


const ModalOverlay = styled.div`
  position:fixed;inset:0;background:rgba(0,0,0,.7);
  backdrop-filter:blur(6px);z-index:500;
  display:flex;align-items:center;justify-content:center;padding:1.5rem;
`;
const ModalBox = styled.div`
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:20px;width:100%;max-width:580px;max-height:90vh;
  overflow-y:auto;
  animation:${modalIn} .3s var(--ease) forwards;
`;
const ModalHeader = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding:1.5rem 1.75rem 1rem;border-bottom:1px solid var(--border);
`;
const ModalTitle = styled.h2`
  font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
`;
const CloseBtn = styled.button`
  background:var(--bg-input);border:1px solid var(--border);color:var(--text-secondary);
  width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.9rem;
  display:flex;align-items:center;justify-content:center;transition:all .2s;
  &:hover{color:var(--text-primary);border-color:var(--border-hover);}
`;
const ModalForm = styled.form`
  display:flex;flex-direction:column;gap:1.1rem;padding:1.5rem 1.75rem;
`;
const FieldRow = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:1rem;`;
const FormGroup = styled.div`display:flex;flex-direction:column;gap:.4rem;`;
const Label = styled.label`
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
  &:focus{border-color:rgba(110,231,183,.5);box-shadow:0 0 0 3px rgba(110,231,183,.08);}
  &::placeholder{color:var(--text-secondary);opacity:.5;}
`;
const Input    = styled.input`${inputBase}`;
const Select   = styled.select`${inputBase}background-color:var(--bg-input);option{background:var(--bg-card);}`;
const Textarea = styled.textarea`${inputBase}resize:vertical;min-height:80px;`;
const TagInputRow = styled.div`display:flex;gap:.5rem;`;
const TagAddBtn   = styled.button`
  background:var(--accent-dim);border:1px solid rgba(110,231,183,.3);
  color:var(--accent);font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;
  padding:.65rem 1rem;border-radius:10px;cursor:pointer;transition:all .2s;white-space:nowrap;
  &:hover{background:rgba(110,231,183,.2);}
`;
const TagList   = styled.div`display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem;`;
const Tag       = styled.span`
  display:inline-flex;align-items:center;gap:.35rem;
  background:var(--accent-dim);border:1px solid rgba(110,231,183,.25);
  color:var(--accent);font-size:.75rem;font-weight:500;
  padding:.2rem .55rem;border-radius:100px;
`;
const TagRemove = styled.button`
  background:none;border:none;color:var(--accent);cursor:pointer;
  font-size:.85rem;line-height:1;opacity:.7;padding:0;
  &:hover{opacity:1;}
`;
const FormError = styled.p`
  color:var(--danger);font-size:.82rem;
  background:var(--danger-dim);border:1px solid rgba(248,113,113,.2);
  padding:.5rem .8rem;border-radius:8px;
`;
const ModalActions = styled.div`display:flex;justify-content:flex-end;gap:.75rem;padding-top:.25rem;`;
const CancelBtn = styled.button`
  background:none;border:1px solid var(--border);color:var(--text-secondary);
  font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;
  padding:.6rem 1.2rem;border-radius:10px;cursor:pointer;transition:all .2s;
  &:hover{border-color:var(--border-hover);color:var(--text-primary);}
`;
const SaveBtn = styled.button`
  background:var(--accent);color:#0d0f14;
  font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;
  border:none;padding:.6rem 1.4rem;border-radius:10px;cursor:pointer;
  display:inline-flex;align-items:center;gap:.5rem;transition:all .2s;
  &:hover:not(:disabled){filter:brightness(1.1);}
  &:disabled{background:var(--bg-input);color:var(--text-secondary);border:1px solid var(--border);cursor:not-allowed;}
`;
const BtnSpinner = styled.span`
  display:inline-block;width:12px;height:12px;
  border:2px solid rgba(0,0,0,.3);border-top-color:#0d0f14;
  border-radius:50%;animation:${spin} .65s linear infinite;
`;