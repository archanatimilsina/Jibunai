import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
const API_BASE = import.meta.env.VITE_API_URL;

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Clash+Display:wght@400;500;600;700&display=swap');

  :root {
    --bg: #07080D;
    --bg-card: #0D0F17;
    --bg-input: rgba(255,255,255,0.03);
    --border: rgba(255,255,255,0.07);
    --border-active: rgba(20,184,166,0.5);

    --text-primary: #EDF2F7;
    --text-secondary: #64748B;
    --text-muted: #334155;

    --teal: #14B8A6;
    --teal-dim: rgba(20,184,166,0.12);
    --teal-glow: rgba(20,184,166,0.25);
    --amber: #F59E0B;
    --red: #EF4444;
    --green: #10B981;

    --radius: 8px;
    --ease: cubic-bezier(0.23,1,0.32,1);
    --font-mono: 'Space Mono', monospace;
    --font-display: 'Clash Display', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--font-mono);
    background: var(--bg);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  ::placeholder { color: var(--text-muted); }
  input, textarea, select { font-family: var(--font-mono); }
`;


const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const scanline = keyframes`
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
`;


const pulseRing = keyframes`
  0%   { box-shadow: 0 0 0 0 var(--teal-glow); }
  70%  { box-shadow: 0 0 0 8px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

const glitch = keyframes`
  0%  { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 0); }
  20% { clip-path: inset(92% 0 1% 0);  transform: translate(2px, 0); }
  40% { clip-path: inset(43% 0 1% 0);  transform: translate(-2px, 0); }
  60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, 0); }
  80% { clip-path: inset(54% 0 7% 0);  transform: translate(-2px, 0); }
  100%{ clip-path: inset(58% 0 43% 0); transform: translate(0); }
`;


const BASE_URL = `${API_BASE}/api`;  


const AboutMe = () => {
  const [mode, setMode] = useState('idle'); 
  const [existingRecord, setExistingRecord] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    baseSecretCode: '',
    sidebarCode: '',
    portalDream: '',
  });

  useEffect(() => {
      const fetchRecord = async () => {
    setMode('loading');
    try {
      const res = await fetch(`${BASE_URL}/aboutme`);
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data) ? data : data.results || [];
        if (records.length > 0) {
          const record = records[0];
          setExistingRecord(record);
          setFormData({
            name:           record.name          || '',
            address:        record.address        || '',
            phone:          record.phone          || '',
            email:          record.email          || '',
            baseSecretCode: '',   
            sidebarCode:    record.sidebarCode    || '',
            portalDream:    record.portalDream    || '',
          });
          setMode('loaded');
        } else {
          setMode('creating');
        }
      } else {
        setMode('creating');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setMode('creating');
    }
  };
    fetchRecord();
  }, []);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.baseSecretCode || !formData.portalDream) {
      setErrorMsg('BASE SECRET CODE and PORTAL DREAM are required for clearance.');
      return;
    }
    setMode('submitting');
    setErrorMsg('');
    try {
      const payload = { ...formData, clearanceLevel: 'ALPHA-9' };
      const res = await fetch(`${BASE_URL}/aboutme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setExistingRecord(created);
        setIsEditing(false);
        setMode('success');
        setTimeout(() => setMode('loaded'), 2500);
      } else {
        const errData = await res.json();
        const msg = Object.values(errData).flat().join(' — ');
        setErrorMsg(msg || 'Transmission failed.');
        setMode('creating');
      }
    } catch (err) {
      console.log(err)
      setErrorMsg('Critical network failure. Packet loss detected.');
      setMode('creating');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!existingRecord?.id) return;
    setMode('submitting');
    setErrorMsg('');
    try {
      const payload = {
        name:         formData.name,
        address:      formData.address,
        phone:        formData.phone,
        email:        formData.email,
        sidebarCode:  formData.sidebarCode,
        portalDream:  formData.portalDream,
        clearanceLevel: 'ALPHA-9',
      };
      if (formData.baseSecretCode) {
        payload.baseSecretCode = formData.baseSecretCode;
      }
      const res = await fetch(`${BASE_URL}/aboutme/${existingRecord.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setExistingRecord(updated);
        setIsEditing(false);
        setMode('success');
        setTimeout(() => setMode('loaded'), 2500);
      } else {
        const errData = await res.json();
        const msg = Object.values(errData).flat().join(' — ');
        setErrorMsg(msg || 'Update transmission failed.');
        setMode('loaded');
      }
    } catch (err) {
      console.log(err)
      setErrorMsg('Critical network failure. Packet loss detected.');
      setMode('loaded');
    }
  };

  const handleDelete = async () => {
    if (!existingRecord?.id) return;
    if (!window.confirm('CONFIRM DELETION: This will permanently erase the operative profile from the archive.')) return;
    setMode('loading');
    try {
      const res = await fetch(`${BASE_URL}/aboutme/${existingRecord.id}/`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        setExistingRecord(null);
        setFormData({ name: '', address: '', phone: '', email: '', baseSecretCode: '', sidebarCode: '', portalDream: '' });
        setMode('creating');
      } else {
        setErrorMsg('Deletion failed. Access may be restricted.');
        setMode('loaded');
      }
    } catch (err) {
      console.log(err)
      setErrorMsg('Network failure during deletion.');
      setMode('loaded');
    }
  };

  const isSubmitting = mode === 'submitting';
  const showForm = mode === 'creating' || isEditing;
  const submitHandler = existingRecord && isEditing ? handleUpdate : handleCreate;

  return (
    <>
      <GlobalStyle />
      <ScanlineOverlay />
      <Page>

        <Header>
          <HeaderEyebrow>
            <Dot active />
            <span>CHRONOS // IDENTITY MANAGEMENT</span>
            <Dot />
            <Dot />
          </HeaderEyebrow>
          <HeaderTitle>Personnel<br /><TealSpan>Profile Log</TealSpan></HeaderTitle>
          <HeaderDesc>
            Operative identity module. Log contact protocols, clearance codes, and vision statements into the secure Chronos archive.
          </HeaderDesc>
        </Header>

        {mode === 'loading' && <StatusBanner variant="info">▶ INITIALIZING SECURE CHANNEL...</StatusBanner>}
        {mode === 'success' && <StatusBanner variant="success">✓ SYNCHRONIZATION COMPLETE — DATA ARCHIVED SUCCESSFULLY</StatusBanner>}
        {errorMsg && <StatusBanner variant="error">✗ {errorMsg}</StatusBanner>}

        {mode === 'loaded' && !isEditing && existingRecord && (
          <RecordCard
            record={existingRecord}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
          />
        )}

        {showForm && (
          <TerminalForm onSubmit={submitHandler}>
            <FormHeader>
              <FormHeaderTitle>
                {existingRecord ? '// PATCH OPERATIVE RECORD' : '// NEW OPERATIVE RECORD'}
              </FormHeaderTitle>
              {existingRecord && (
                <CancelBtn type="button" onClick={() => { setIsEditing(false); setMode('loaded'); setErrorMsg(''); }}>
                  [ CANCEL ]
                </CancelBtn>
              )}
            </FormHeader>

            <Section>
              <SectionLabel>01 — STANDARD PROTOCOL DETAILS</SectionLabel>
              <Grid2>
                <Field label="OPERATIVE NAME / CODENAME" required>
                  <Input
                    name="name"
                    placeholder="Alex 'Wraith' Johnson"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </Field>
                <Field label="SECURE EMAIL PROTOCOL" required>
                  <Input
                    type="email"
                    name="email"
                    placeholder="operative@chronos.net"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </Field>
              </Grid2>
              <Grid2>
                <Field label="ENCRYPTED COMM LINE (PHONE)">
                  <Input
                    type="tel"
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Field>
                <Field label="BASE LOCATION / PHYSICAL ADDRESS">
                  <Input
                    name="address"
                    placeholder="Sector 9 — Classified"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Field>
              </Grid2>
            </Section>

            <Divider />

            <Section>
              <SectionLabel accent>02 — CLEARANCE & VISION MATRIX</SectionLabel>
              <Grid2>
                <Field label="BASE SECRET CODE (required: 8888)" required accent>
                  <Input
                    type="password"
                    name="baseSecretCode"
                    placeholder={existingRecord ? '•••• (leave blank to keep)' : '8888'}
                    value={formData.baseSecretCode}
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]*"
                    required={!existingRecord}
                    disabled={isSubmitting}
                    accent
                  />
                </Field>
                <Field label="SIDEBAR SEQUENTIAL CODE" accent>
                  <Input
                    name="sidebarCode"
                    placeholder="Up-Up-Down-Down-Left-Right..."
                    value={formData.sidebarCode}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    accent
                  />
                </Field>
              </Grid2>
              <Field label="DREAM / VISION FOR SECRET PORTAL" required accent>
                <Textarea
                  name="portalDream"
                  placeholder="Describe your vision to bypass dimensional barriers..."
                  value={formData.portalDream}
                  onChange={handleChange}
                  rows={5}
                  required
                  disabled={isSubmitting}
                  accent
                />
              </Field>
            </Section>

            <ActionRow>
              <SubmitBtn type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Spinner /> SYNCHRONIZING...</>
                  : existingRecord
                    ? '▶ PATCH RECORD'
                    : '▶ SYNC PERSONNEL DATA'
                }
              </SubmitBtn>
            </ActionRow>
          </TerminalForm>
        )}

      </Page>
    </>
  );
};

const RecordCard = ({ record, onEdit, onDelete }) => (
  <CardWrap>
    <CardHeader>
      <CardTitle>OPERATIVE PROFILE // ACTIVE RECORD</CardTitle>
      <CardBadge>{record.clearanceLevel || 'ALPHA-9'}</CardBadge>
    </CardHeader>

    <CardGrid>
      <DataField label="OPERATIVE NAME">{record.name}</DataField>
      <DataField label="EMAIL PROTOCOL">{record.email}</DataField>
      <DataField label="COMM LINE">{record.phone || '—'}</DataField>
      <DataField label="BASE LOCATION">{record.address || '—'}</DataField>
      <DataField label="SIDEBAR CODE">{record.sidebarCode || '—'}</DataField>
      <DataField label="TRANSMISSION TIMESTAMP">
        {record.timestamp ? new Date(record.timestamp).toLocaleString() : '—'}
      </DataField>
    </CardGrid>

    <DataField label="PORTAL VISION" full>
      <PortalText>{record.portalDream}</PortalText>
    </DataField>

    <CardActions>
      <EditBtn onClick={onEdit}>[ EDIT RECORD ]</EditBtn>
      <DeleteBtn onClick={onDelete}>[ DELETE ]</DeleteBtn>
    </CardActions>
  </CardWrap>
);


const Field = ({ label, children, required, accent, full }) => (
  <FieldWrap full={full}>
    <FieldLabel accent={accent}>
      {label}{required && <Req> *</Req>}
    </FieldLabel>
    {children}
  </FieldWrap>
);

const DataField = ({ label, children, full }) => (
  <DataFieldWrap full={full}>
    <DataLabel>{label}</DataLabel>
    <DataValue>{children}</DataValue>
  </DataFieldWrap>
);



const ScanlineOverlay = styled.div`
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 1000;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(transparent, rgba(20,184,166,0.03), transparent);
    animation: ${scanline} 8s linear infinite;
  }
`;

const Page = styled.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 6rem 2rem 10rem;
  animation: ${fadeUp} 0.6s var(--ease) both;
`;

const Header = styled.header`
  margin-bottom: 5rem;
`;

const HeaderEyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.65rem;
  letter-spacing: 4px;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 2rem;
`;

const Dot = styled.span`
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${p => p.active ? 'var(--teal)' : 'var(--text-muted)'};
  display: inline-block;
  ${p => p.active && css`animation: ${pulseRing} 2s infinite;`}
`;

const HeaderTitle = styled.h1`
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 7vw, 5rem);
  font-weight: 700;
  line-height: 1.0;
  letter-spacing: -0.03em;
  margin-bottom: 1.5rem;
`;

const TealSpan = styled.span`
  color: var(--teal);
  position: relative;
  &::before {
    content: attr(data-text);
    position: absolute;
    left: 2px; top: 0;
    color: var(--teal);
    opacity: 0.3;
    animation: ${glitch} 6s infinite;
    animation-delay: 3s;
  }
`;

const HeaderDesc = styled.p`
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.9;
  max-width: 560px;
`;

const StatusBanner = styled.div`
  padding: 0.9rem 1.4rem;
  border-radius: var(--radius);
  font-size: 0.72rem;
  letter-spacing: 2px;
  margin-bottom: 2rem;
  border: 1px solid;
  animation: ${fadeUp} 0.4s var(--ease) both;
  ${p => p.variant === 'info' && css`
    background: rgba(20,184,166,0.05);
    border-color: rgba(20,184,166,0.2);
    color: var(--teal);
  `}
  ${p => p.variant === 'success' && css`
    background: rgba(16,185,129,0.05);
    border-color: rgba(16,185,129,0.3);
    color: var(--green);
  `}
  ${p => p.variant === 'error' && css`
    background: rgba(239,68,68,0.05);
    border-color: rgba(239,68,68,0.3);
    color: var(--red);
  `}
`;

const CardWrap = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  animation: ${fadeUp} 0.5s var(--ease) both;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--teal-glow), transparent);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const CardTitle = styled.h2`
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--text-secondary);
  letter-spacing: 2px;
`;

const CardBadge = styled.span`
  font-size: 0.65rem;
  letter-spacing: 3px;
  padding: 0.3rem 0.8rem;
  border: 1px solid var(--teal-dim);
  color: var(--teal);
  border-radius: 50px;
  background: var(--teal-dim);
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const DataFieldWrap = styled.div`
  ${p => p.full && css`grid-column: 1 / -1;`}
  margin-bottom: ${p => p.full ? '2rem' : '0'};
`;

const DataLabel = styled.div`
  font-size: 0.6rem;
  letter-spacing: 3px;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
`;

const DataValue = styled.div`
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
`;

const PortalText = styled.p`
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.9;
  font-style: italic;
  border-left: 2px solid var(--teal-dim);
  padding-left: 1rem;
`;

const CardActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
  margin-top: 1rem;
`;

const EditBtn = styled.button`
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 2px;
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border-active);
  color: var(--teal);
  background: var(--teal-dim);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s var(--ease);
  &:hover { background: rgba(20,184,166,0.2); }
`;

const DeleteBtn = styled.button`
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 2px;
  padding: 0.6rem 1.2rem;
  border: 1px solid rgba(239,68,68,0.3);
  color: var(--red);
  background: rgba(239,68,68,0.05);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s var(--ease);
  &:hover { background: rgba(239,68,68,0.15); }
`;

const TerminalForm = styled.form`
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  animation: ${fadeUp} 0.5s var(--ease) both;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
  }
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FormHeaderTitle = styled.h2`
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: var(--text-secondary);
`;

const CancelBtn = styled.button`
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: var(--text-secondary); }
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionLabel = styled.div`
  font-size: 0.62rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: ${p => p.accent ? 'var(--teal)' : 'var(--text-muted)'};
  margin-bottom: 0.5rem;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--border);
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
`;

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  ${p => p.full && css`grid-column: 1 / -1;`}
`;

const FieldLabel = styled.label`
  font-size: 0.6rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${p => p.accent ? 'var(--teal)' : 'var(--text-secondary)'};
`;

const Req = styled.span`
  color: var(--red);
`;

const inputBase = css`
  width: 100%;
  padding: 0.85rem 1rem;
  font-size: 0.82rem;
  font-family: var(--font-mono);
  border-radius: var(--radius);
  border: 1px solid ${p => p.accent ? 'rgba(20,184,166,0.2)' : 'var(--border)'};
  background: var(--bg-input);
  color: var(--text-primary);
  transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);

  &:focus {
    outline: none;
    border-color: var(--teal);
    box-shadow: 0 0 0 3px var(--teal-dim);
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Input = styled.input`${inputBase}`;

const Textarea = styled.textarea`
  ${inputBase}
  resize: vertical;
  min-height: 120px;
  line-height: 1.7;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
`;

const SubmitBtn = styled.button`
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 1rem 2rem;
  border: none;
  border-radius: var(--radius);
  background: var(--teal);
  color: #07080D;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.25s var(--ease);
  box-shadow: 0 4px 20px rgba(20,184,166,0.2);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(20,184,166,0.35);
  }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled {
    background: var(--bg-input);
    color: var(--text-muted);
    border: 1px solid var(--border);
    box-shadow: none;
    cursor: wait;
  }
`;

const spinAnim = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const Spinner = styled.span`
  width: 12px; height: 12px;
  border: 2px solid var(--text-muted);
  border-top-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: ${spinAnim} 0.7s linear infinite;
`;

export default AboutMe;