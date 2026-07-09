import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes, css, createGlobalStyle } from 'styled-components';

const API_BASE = import.meta.env.VITE_API_URL;
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background-color: #f5f0e8;
    background-image:
      radial-gradient(circle at 20% 50%, rgba(180,160,120,0.07) 0%, transparent 50%),
      radial-gradient(circle at 80% 10%, rgba(180,160,120,0.05) 0%, transparent 40%),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    font-family: 'DM Sans', sans-serif;
    color: #1a1410;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #ede8df; }
  ::-webkit-scrollbar-thumb { background: #c4b89a; border-radius: 3px; }
`;

const T = {
  ink:     '#1a1410',
  muted:   '#7c6f5e',
  border:  '#ddd5c3',
  cream:   '#fcf9f4',
  warm:    '#f5f0e8',
  tape:    'rgba(210,190,150,0.18)',
  green:   '#2d7a5f',
  red:     '#b5352a',
  amber:   '#c28a1a',
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const modalIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;
const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-5px); }
`;
const spinOnce = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;


const API = {
  list:   `${API_BASE}/api/daylogs/`,
  detail: (id) => `${API_BASE}//api/daylogs/${id}/`,
};

const MOODS = ['Happy', 'Okay', 'Neutral', 'Sad', 'Wired', 'Tired'];

const MOOD_PALETTE = {
  Happy:   { bg: '#d1f0e0', fg: '#1a5c36' },
  Okay:    { bg: '#fde9cc', fg: '#7a4010' },
  Neutral: { bg: '#e8e2d8', fg: '#5a4f40' },
  Sad:     { bg: '#d5e8f7', fg: '#1e3f6a' },
  Wired:   { bg: '#fce8e8', fg: '#8b1a1a' },
  Tired:   { bg: '#eaedf2', fg: '#374050' },
};

const todayISO = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  title:      '',
  date:       todayISO(),
  mood:       'Neutral',
  remote_url: '',
  source:     'remote',
};

const fmtDate = (str) =>
  new Date(str + 'T00:00:00Z').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });


export default function MyDayLogPage() {
  const [entries,    setEntries]    = useState([]);
  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [isEditing,  setIsEditing]  = useState(false);
  const [currentId,  setCurrentId]  = useState(null);
  const [isModalOpen,setIsModalOpen]= useState(false);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [toast,      setToast]      = useState(null);
  const [localPreview, setLocalPreview] = useState('');

  const fileRef = useRef(null);

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(API.list);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setEntries(await res.json());
    } catch {
      setFetchError('Cannot reach backend. Check that the Django server is running.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setCurrentId(null);
    setLocalPreview('');
    if (fileRef.current) fileRef.current.value = '';
    setIsModalOpen(true);
  };

  const openEdit = (entry) => {
    setFormData({
      title:      entry.title,
      date:       entry.date,
      mood:       entry.mood,
      remote_url: entry.url || '',
      source:     entry.source || 'remote',
    });
    setIsEditing(true);
    setCurrentId(entry.id);
    setLocalPreview(entry.url || '');
    if (fileRef.current) fileRef.current.value = '';
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setLocalPreview('');
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (localPreview.startsWith('blob:')) URL.revokeObjectURL(localPreview);
    const blob = URL.createObjectURL(file);
    setLocalPreview(blob);
    setFormData(p => ({ ...p, source: 'local', remote_url: '' }));
  };

  const handleField = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append('title', formData.title.trim());
    fd.append('date',  formData.date);
    fd.append('mood',  formData.mood);

    const hasNewFile = fileRef.current?.files?.[0];

    if (hasNewFile) {
      fd.append('file', fileRef.current.files[0]);
      fd.append('source', 'local');
    } else {
      fd.append('source',     'remote');
      fd.append('remote_url', formData.remote_url || '');
    }

    const url    = isEditing ? API.detail(currentId) : API.list;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, body: fd });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const firstKey = Object.keys(err)[0];
        const msg = firstKey
          ? `${firstKey}: ${Array.isArray(err[firstKey]) ? err[firstKey][0] : err[firstKey]}`
          : 'Submission failed.';
        throw new Error(msg);
      }

      await fetchEntries();
      closeModal();
      showToast(isEditing ? 'Day updated.' : 'Day logged.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm('Remove this memory permanently?')) return;
    try {
      const res = await fetch(API.detail(entry.id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setEntries(p => p.filter(e => e.id !== entry.id));
      showToast('Memory removed.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const sorted = [...entries].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const previewSrc = localPreview || (formData.source === 'remote' ? formData.remote_url : '');

 
  return (
    <>
      <GlobalStyle />
      <PageWrap>

        {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

        <Hero>
          <Eyebrow>Daily Chronicle</Eyebrow>
          <HeroTitle>My <em>Day Log</em></HeroTitle>
          <HeroSub>
            A curated archive of fleeting moments, captured days, and personal reflections.
          </HeroSub>
          <AddBtn onClick={openAdd}>
            <AddPlus>+</AddPlus> Log New Day
          </AddBtn>
        </Hero>

        {fetchError && <ErrorBanner>{fetchError}</ErrorBanner>}

        {loading && (
          <LoadRow>
            <LoadDot $d="0s" /><LoadDot $d=".15s" /><LoadDot $d=".3s" />
            <span>Developing memories…</span>
          </LoadRow>
        )}

        {!loading && !fetchError && entries.length === 0 && (
          <EmptyFrame onClick={openAdd}>
            <EmptyTitle>Your archive is empty.</EmptyTitle>
            <EmptyHint>Click to log your first day memory.</EmptyHint>
          </EmptyFrame>
        )}

        {sorted.length > 0 && (
          <Masonry>
            {sorted.map((entry, i) => (
              <PolaroidCard
                key={entry.id}
                entry={entry}
                index={i}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </Masonry>
        )}

        {isModalOpen && (
          <Overlay onClick={closeModal}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalClose onClick={closeModal}>×</ModalClose>
              <ModalTitle>{isEditing ? 'Edit Day Stamp' : 'Log New Memory'}</ModalTitle>

              <DayForm onSubmit={handleSubmit}>
                <Field>
                  <FLabel>Title *</FLabel>
                  <FInput
                    required
                    name="title"
                    placeholder="What defined this day?"
                    value={formData.title}
                    onChange={handleField}
                  />
                </Field>

                <FRow>
                  <Field>
                    <FLabel>Date *</FLabel>
                    <FInput type="date" name="date" required value={formData.date} onChange={handleField} />
                  </Field>
                  <Field>
                    <FLabel>Mood</FLabel>
                    <FSelect name="mood" value={formData.mood} onChange={handleField}>
                      {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </FSelect>
                  </Field>
                </FRow>

                <Field>
                  <FLabel>Image (optional)</FLabel>
                  <UploadRow>
                    <HiddenInput type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} />
                    <UploadBtn type="button" onClick={() => fileRef.current?.click()}>
                      {fileRef.current?.files?.[0] ? '↺ Replace File' : '↑ Upload File'}
                    </UploadBtn>
                    {fileRef.current?.files?.[0] && (
                      <FileStatus>✓ {fileRef.current.files[0].name}</FileStatus>
                    )}
                  </UploadRow>
                </Field>

                {!fileRef.current?.files?.[0] && (
                  <Field>
                    <FLabel>Or Remote Image URL</FLabel>
                    <FInput
                      type="url"
                      name="remote_url"
                      placeholder="https://images.unsplash.com/…"
                      value={formData.remote_url}
                      onChange={handleField}
                    />
                  </Field>
                )}

                {previewSrc && (
                  <PreviewBox>
                    <img src={previewSrc} alt="Preview" />
                  </PreviewBox>
                )}

                <ModalActions>
                  <MCancel type="button" onClick={closeModal}>Cancel</MCancel>
                  <MSubmit
                    type="submit"
                    disabled={submitting || !formData.title || !formData.date}
                    $editing={isEditing}
                  >
                    {submitting
                      ? <Spinner />
                      : isEditing ? 'Save Changes' : 'Archive Memory'}
                  </MSubmit>
                </ModalActions>
              </DayForm>
            </Modal>
          </Overlay>
        )}
      </PageWrap>
    </>
  );
}


function PolaroidCard({ entry, index, onEdit, onDelete }) {
  const tilt = React.useMemo(() => (((entry.id * 7919) % 100) / 100 - 0.5) * 7, [entry.id]);
  const tapePos = entry.id % 2 === 0 ? 'left' : 'right';
  const mood = MOOD_PALETTE[entry.mood] || MOOD_PALETTE.Neutral;

  return (
    <CardWrap style={{ '--tilt': `${tilt}deg`, animationDelay: `${index * 0.04}s` }}>
      <Polaroid>
        <Tape $pos={tapePos} />

        {entry.url ? (
          <PhotoArea>
            <img src={entry.url} alt={entry.title} loading="lazy" />
            <PhotoOverlay className="photo-overlay">
              <OBtn $color={T.green} onClick={() => onEdit(entry)}>Edit</OBtn>
              <OBtn $color={T.red}   onClick={() => onDelete(entry)}>Delete</OBtn>
            </PhotoOverlay>
          </PhotoArea>
        ) : (
          <NoPhoto>
            <NoPhotoActions>
              <OBtn $color={T.green} onClick={() => onEdit(entry)}>Edit</OBtn>
              <OBtn $color={T.red}   onClick={() => onDelete(entry)}>Delete</OBtn>
            </NoPhotoActions>
          </NoPhoto>
        )}

        <CardFoot>
          <DateStamp>{fmtDate(entry.date)}</DateStamp>
          <MoodTag style={{ background: mood.bg, color: mood.fg }}>
            {entry.mood.toUpperCase()}
          </MoodTag>
          <CardTitle>{entry.title}</CardTitle>
        </CardFoot>
      </Polaroid>
    </CardWrap>
  );
}


const PageWrap = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  padding: 5rem 2rem 10rem;
  animation: ${fadeUp} 0.5s ease;
`;

const Toast = styled.div`
  position: fixed;
  top: 1.5rem; right: 1.5rem;
  z-index: 2000;
  padding: 0.75rem 1.4rem;
  border-radius: 6px;
  font-family: 'DM Mono', monospace;
  font-size: 0.78rem;
  font-weight: 500;
  animation: ${fadeUp} 0.3s ease;
  background: ${p => p.$type === 'error' ? '#3b0d0a' : '#0d2b1e'};
  color:      ${p => p.$type === 'error' ? '#f87171' : '#4ade80'};
  border: 1px solid ${p => p.$type === 'error' ? '#7f1d1d' : '#14532d'};
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
`;

const Hero = styled.header`
  text-align: center;
  margin-bottom: 6rem;
`;

const Eyebrow = styled.p`
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: ${T.muted};
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;

  &::before, &::after {
    content: '';
    flex: 0 1 60px;
    height: 1px;
    background: ${T.border};
  }
`;

const HeroTitle = styled.h1`
  font-family: 'Playfair Display', serif;
  font-size: clamp(3rem, 7vw, 5.5rem);
  font-weight: 800;
  color: ${T.ink};
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 1.25rem;

  em {
    font-style: italic;
    color: ${T.green};
    position: relative;
    &::after {
      content: '';
      position: absolute;
      bottom: 6px; left: 0; right: 0;
      height: 10px;
      background: ${T.green};
      opacity: 0.1;
      border-radius: 2px;
    }
  }
`;

const HeroSub = styled.p`
  font-size: 1.05rem;
  color: ${T.muted};
  max-width: 520px;
  margin: 0 auto 2.5rem;
  line-height: 1.8;
`;

const AddBtn = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: ${T.ink};
  border: none;
  padding: 1rem 2rem;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 8px 30px rgba(26,20,16,0.18);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 36px rgba(26,20,16,0.25);
  }
`;

const AddPlus = styled.span`font-size: 1.4rem; font-weight: 300;`;

const ErrorBanner = styled.div`
  background: #fdf0ee;
  border: 1px solid #e8b4af;
  border-radius: 8px;
  color: ${T.red};
  font-family: 'DM Mono', monospace;
  font-size: 0.78rem;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
`;

const LoadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: 'DM Mono', monospace;
  font-size: 0.8rem;
  color: ${T.muted};
  padding: 4rem;
`;

const LoadDot = styled.span`
  width: 7px; height: 7px;
  background: ${T.green};
  border-radius: 50%;
  display: inline-block;
  animation: ${dotBounce} 1s ease infinite;
  animation-delay: ${p => p.$d};
`;

const EmptyFrame = styled.button`
  display: block;
  width: 100%;
  background: ${T.cream};
  border: 1.5px dashed ${T.border};
  border-radius: 12px;
  padding: 8rem 2rem;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s;

  &:hover { border-color: ${T.green}; }
`;

const EmptyTitle = styled.h3`
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  color: ${T.muted};
  margin-bottom: 0.5rem;
`;

const EmptyHint = styled.p`
  font-size: 0.95rem;
  color: ${T.muted};
  opacity: 0.7;
`;

const Masonry = styled.div`
  columns: 3;
  column-gap: 2rem;
  padding: 1rem 0;

  @media (max-width: 1024px) { columns: 2; }
  @media (max-width: 600px)  { columns: 1; }
`;

const CardWrap = styled.div`
  break-inside: avoid;
  display: inline-block;
  width: 100%;
  margin-bottom: 2.5rem;
  transform: rotate(var(--tilt, 0deg));
  transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), z-index 0s;
  animation: ${fadeUp} 0.5s ease both;
  position: relative;
  z-index: 1;

  &:hover {
    transform: rotate(0deg) scale(1.03);
    z-index: 10;

    .photo-overlay { opacity: 1; }
  }
`;

const Polaroid = styled.article`
  background: ${T.cream};
  padding: 1rem 1rem 1.5rem;
  border-radius: 2px;
  border: 1px solid ${T.border};
  position: relative;
  box-shadow: 0 3px 12px rgba(26,20,16,0.06), 0 1px 3px rgba(26,20,16,0.04);
  transition: box-shadow 0.3s ease;

  ${CardWrap}:hover & {
    box-shadow: 0 16px 50px rgba(26,20,16,0.14);
  }
`;

const Tape = styled.div`
  position: absolute;
  width: 56px; height: 18px;
  background: ${T.tape};
  border: 1px solid rgba(180,160,110,0.12);
  z-index: 5;
  top: -6px;
  ${p => p.$pos === 'left'  ? 'left: 14px; transform: rotate(-12deg);' : 'right: 14px; transform: rotate(10deg);'}
`;

const PhotoArea = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 1px;
  background: ${T.warm};
  margin-bottom: 1rem;

  img {
    width: 100%;
    display: block;
    object-fit: cover;
    transition: transform 1.8s ease;
  }

  ${CardWrap}:hover img { transform: scale(1.08); }
`;

const NoPhoto = styled.div`
  background: ${T.warm};
  border: 1px dashed ${T.border};
  border-radius: 1px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(26,20,16,0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  opacity: 0;
  transition: opacity 0.25s ease;
  z-index: 3;
`;

const NoPhotoActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const OBtn = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.45rem 1rem;
  border-radius: 50px;
  border: none;
  background: ${T.cream};
  color: ${p => p.$color};
  cursor: pointer;
  transition: transform 0.15s;

  &:hover { transform: scale(1.08); }
`;

const CardFoot = styled.footer`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const DateStamp = styled.time`
  font-family: 'DM Mono', monospace;
  font-size: 0.68rem;
  color: #a8957e;
`;

const MoodTag = styled.span`
  display: inline-block;
  font-family: 'DM Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.15rem 0.6rem;
  border-radius: 3px;
  width: fit-content;
`;

const CardTitle = styled.h3`
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${T.ink};
  line-height: 1.4;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(26,20,16,0.65);
  backdrop-filter: blur(10px);
  z-index: 1000;
  animation: ${overlayIn} 0.3s ease;
`;

const Modal = styled.div`
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 95%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  background: ${T.cream};
  border-radius: 14px;
  padding: 3rem;
  box-shadow: 0 24px 80px rgba(26,20,16,0.25);
  animation: ${modalIn} 0.35s cubic-bezier(.34,1.2,.64,1);

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
`;

const ModalClose = styled.button`
  position: absolute;
  top: 1.25rem; right: 1.5rem;
  background: none;
  border: none;
  font-size: 2rem;
  color: ${T.muted};
  cursor: pointer;
  line-height: 1;
  transition: color 0.15s;

  &:hover { color: ${T.red}; }
`;

const ModalTitle = styled.h3`
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${T.ink};
  letter-spacing: -0.03em;
  margin-bottom: 2.5rem;
  text-align: center;
`;

const DayForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FLabel = styled.label`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${T.muted};
`;

const inputBase = css`
  padding: 0.85rem 1.1rem;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem;
  border: 1px solid ${T.border};
  border-radius: 8px;
  background: #fff;
  color: ${T.ink};
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;

  &::placeholder { color: #c4b89a; }
  &:focus {
    border-color: ${T.ink};
    box-shadow: 0 0 0 3px rgba(26,20,16,0.06);
  }
`;

const FInput  = styled.input`${inputBase}`;
const FSelect = styled.select`${inputBase}; appearance: none; cursor: pointer;`;

const FRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const UploadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const HiddenInput = styled.input`display: none;`;

const UploadBtn = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${T.ink};
  background: #fff;
  border: 1px solid ${T.border};
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover { background: ${T.warm}; border-color: ${T.muted}; }
`;

const FileStatus = styled.span`
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  color: ${T.green};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
`;

const PreviewBox = styled.div`
  margin-top: 0.25rem;

  img {
    width: 100px;
    aspect-ratio: 4/3;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid ${T.border};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
`;

const MCancel = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: ${T.muted};
  background: none;
  border: 1px solid ${T.border};
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: ${T.warm}; color: ${T.ink}; }
`;

const MSubmit = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  background: ${p => p.$editing ? T.ink : T.green};
  border: none;
  padding: 0.8rem 1.75rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.15s, transform 0.1s;

  &:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spinOnce} 0.7s linear infinite;
`;