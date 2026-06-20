import React, { useState, useEffect, useRef } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import charImg from '../assets/img/397192bdf6375902aaab9436359d2dc0.jpg';

import ProjectSpecificationPage from './projectDescriptionPage';
import ProfessionalCredential from './ProfessionalCredential';
import SecretWorld from '../ArchanaArea/components/MyArea';

const API_BASE = import.meta.env.VITE_API_URL;
const BASE = `${API_BASE}/api`;

const skills = [
  { title: "🖥 Languages",            pills: ["C", "C++", "Python", "PHP"] },
  { title: "🎨 Frontend",             pills: ["HTML", "CSS", "JavaScript", "TypeScript", "React.js"] },
  { title: "⚙ Backend",              pills: ["Laravel", "Django", "Django REST Framework"] },
  { title: "🛠 Testing & Automation", pills: ["Cucumber", "Playwright", "Gherkin"] },
];

const PROJECT_TYPE_LABEL = {
  solo:        'Solo',
  group:       'Group',
  academic:    'Academic',
  open_source: 'Open Source',
};

const PD_EMOJI = {
  Mentorship:     '🎓',
  Internship:     '💼',
  Course:         '📚',
  Fellowship:     '🌟',
  Session:        '🗣️',
  'Online Course':'💻',
};

const verifySecret = async (field, value) => {
  try {
    const res = await fetch(`${BASE}/verify-secret/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value }),
    });
    const data = await res.json();
    return data.allowed;
  } catch {
    return false;
  }
};


function GestureNavModal({ onClose, onConfirm, currentStatus }) {
  const modalRef = useRef(null);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  const isActive = currentStatus === 'active';

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalBox ref={modalRef}>
        <ModalCloseBtn onClick={onClose}>✕</ModalCloseBtn>
        <ModalIconWrap>👆</ModalIconWrap>
        <ModalTitle>Gesture Navigation</ModalTitle>
        <ModalDesc>
          Draw gestures on screen to navigate — no clicks, no scrolling. Triple-tap anywhere to activate the drawing canvas.
        </ModalDesc>

        <ModalHowTo>
          <strong>How to use:</strong> triple-tap (touch / trackpad / mouse) anywhere on the page. A canvas appears — draw your gesture. Pause for a moment and it navigates automatically. Press <strong>Esc</strong> to cancel.
        </ModalHowTo>

        <ModalCurrentStatus $active={isActive}>
          <span className="status-dot" />
          Currently: {isActive ? 'Active' : 'Inactive'}
        </ModalCurrentStatus>

        <ModalBtnRow>
          <ModalBtnYes onClick={() => onConfirm('active')}>
            {isActive ? '✓ Keep Active' : '✓ Activate'}
          </ModalBtnYes>
          <ModalBtnNo onClick={() => onConfirm('inactive')}>
            ✕ {isActive ? 'Deactivate' : 'Keep Off'}
          </ModalBtnNo>
        </ModalBtnRow>
      </ModalBox>
    </ModalOverlay>
  );
}


function SecretGate({ onBack, onUnlock }) {
  const [step,  setStep]  = useState('gate');
  const [dream, setDream] = useState('');
  const [wrong, setWrong] = useState(false);
  const inputRef          = useRef(null);

  useEffect(() => {
    if (step === 'dream' && inputRef.current) inputRef.current.focus();
  }, [step]);

  const handleCheck = async () => {
  const allowed = await verifySecret('dream', dream.trim());
  if (allowed) {
    onUnlock();
  } else {
    setWrong(true);
    setTimeout(() => setWrong(false), 500);
    setDream('');
  }
};


  return (
    <SecretGatePage>
      <GateBackBtn onClick={onBack}>← Back</GateBackBtn>
      <GateGlyph>⛩️</GateGlyph>
      <GateTitle>Ohhh!! You accidentally<br />unlocked the <span>secret area</span></GateTitle>
      <GateSubtitle>Restricted zone · authorised access only</GateSubtitle>
      <GateCard>
        <GateLockBadge><span />Private Access</GateLockBadge>
        <GateCardTitle>But unfortunately, only Archana can go inside through it.</GateCardTitle>
        <GateCardDesc>
          This space holds something private. Access is reserved for the one who knows the dream word.
        </GateCardDesc>
        {step === 'gate' && (
          <GateAreYouRow>
            <GateAreYouLabel>Are you Archana?</GateAreYouLabel>
            <GateYesBtn onClick={() => setStep('dream')}>Yes</GateYesBtn>
            <GateNoBtn  onClick={onBack}>No, go back</GateNoBtn>
          </GateAreYouRow>
        )}
        {step === 'dream' && (
          <>
            <GateCardTitle style={{ marginBottom: '0.75rem' }}>Then type your dream →</GateCardTitle>
            <DreamInputWrap>
              <DreamInput
                ref={inputRef}
                value={dream}
                onChange={e => setDream(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                className={wrong ? 'wrong' : ''}
                placeholder="enter the dream word..."
                spellCheck={false}
                autoComplete="off"
              />
              <DreamArrowBtn onClick={handleCheck} aria-label="Submit">→</DreamArrowBtn>
            </DreamInputWrap>
            <DreamHint>Case sensitive · press enter or →</DreamHint>
          </>
        )}
      </GateCard>
    </SecretGatePage>
  );
}


function useApiList(endpoint) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}${endpoint}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : json.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [endpoint]); // eslint-disable-line
  return { data, loading, error, retry: load };
}

function normaliseProject(p) {
  return {
    ...p,
    note:   p.description || '',
    tech:   p.tech        || PROJECT_TYPE_LABEL[p.project_type] || 'Project',
    github: p.github_link || null,
    techStack: typeof p.tech_stack === 'object' && !Array.isArray(p.tech_stack) ? p.tech_stack : {},
    architecturalHighlights: Array.isArray(p.features) ? p.features : [],
    entityType: 'project',
  };
}
function normalisePD(pd) {
  return {
    ...pd,
    emoji:            PD_EMOJI[pd.name] || '🎓',
    type:             (pd.name || '').toLowerCase(),
    link:             pd.certificate_link || '#',
    certificateImage: pd.certificate_image_url || null,
    learnings:        Array.isArray(pd.learnings)       ? pd.learnings       : [],
    skillsAcquired:   Array.isArray(pd.skills_acquired) ? pd.skills_acquired : [],
    entityType: 'credential',
  };
}

function ProjectsSection({ onCardClick }) {
  const { data: projects, loading, error, retry } = useApiList('/projectListView/');
  return (
    <Section>
      <SectionLabel>Engineering Projects</SectionLabel>
      {loading && <LoadingRow><Spinner /><LoadText>Loading projects…</LoadText></LoadingRow>}
      {!loading && error && <ErrorBanner>⚠ {error}<RetryBtn onClick={retry}>Retry</RetryBtn></ErrorBanner>}
      {!loading && !error && projects.length === 0 && <EmptyState>No projects added yet</EmptyState>}
      {!loading && !error && projects.length > 0 && (
        <CardGrid>
          {projects.map(proj => {
            const norm = normaliseProject(proj);
            return (
              <Card key={proj.id} $clickable onClick={() => onCardClick(norm)}>
                <CardTop>
                  <CardMeta>
                    <Tag>{PROJECT_TYPE_LABEL[proj.project_type] || proj.project_type || 'Project'}</Tag>
                  </CardMeta>
                  <CardTitle>{proj.name}</CardTitle>
                  <CardSub>{proj.description || proj.tech}</CardSub>
                </CardTop>
                <CardFooter>
                  <span>Inspect Architecture</span>
                  <span className="arrow">→</span>
                </CardFooter>
              </Card>
            );
          })}
        </CardGrid>
      )}
    </Section>
  );
}

function CredentialsSection({ onCardClick }) {
  const { data: pdItems, loading, error, retry } = useApiList('/pdListView/');
  return (
    <Section>
      <SectionLabel>Professional Credentials</SectionLabel>
      {loading && <LoadingRow><Spinner /><LoadText>Loading credentials…</LoadText></LoadingRow>}
      {!loading && error && <ErrorBanner>⚠ {error}<RetryBtn onClick={retry}>Retry</RetryBtn></ErrorBanner>}
      {!loading && !error && pdItems.length === 0 && <EmptyState>No credentials added yet</EmptyState>}
      {!loading && !error && pdItems.length > 0 && (
        <CardGrid>
          {pdItems.map(pd => {
            const norm = normalisePD(pd);
            return (
              <Card key={pd.id} $clickable onClick={() => onCardClick(norm)}>
                <CardTop>
                  <CardMeta>
                    <DurationTag>{pd.duration}</DurationTag>
                  </CardMeta>
                  <CredentialType>{pd.name}</CredentialType>
                  <CardTitle style={{ fontSize: '1.1rem' }}>{pd.subject}</CardTitle>
                  <CardSub style={{ marginTop: '0.25rem' }}>{pd.company}</CardSub>
                </CardTop>
                <CardFooter>
                  <span>View Certificate</span>
                  <span className="arrow">→</span>
                </CardFooter>
              </Card>
            );
          })}
        </CardGrid>
      )}
    </Section>
  );
}


export default function PortfolioLanding() {
  const [activeItem,       setActiveItem]       = useState(null);
  const [showGestureModal, setShowGestureModal] = useState(false);
  const [showSecretGate,   setShowSecretGate]   = useState(false);
  const [showSecretWorld,  setShowSecretWorld]  = useState(false);

  const [gestureNavStatus, setGestureNavStatus] = useState(
    () => localStorage.getItem('gestureNav') || 'inactive'
  );
  const gestureEnabled = gestureNavStatus === 'active';

useEffect(() => {
  const bufRef = { current: '' };
  const handler = async (e) => {
    if (!/^[0-9]$/.test(e.key)) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    bufRef.current = (bufRef.current + e.key).slice(-4);
    if (bufRef.current.length === 4) {
      const allowed = await verifySecret('gate', bufRef.current);
      if (allowed) { bufRef.current = ''; setShowSecretGate(true); }
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);

  const handleCardClick = (item) => {
    setActiveItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const clearActive = () => setActiveItem(null);

  const handleGestureConfirm = (choice) => {
    localStorage.setItem('gestureNav', choice);
    setGestureNavStatus(choice);
    setShowGestureModal(false);
  };

  const handleGestureNavBtnClick = () => {
    setShowGestureModal(true);
  };

  if (showSecretWorld) {
    return (
      <>
        <GlobalStyle />
        <SecretWorld onBack={() => { setShowSecretWorld(false); setShowSecretGate(false); }} />
      </>
    );
  }
  if (showSecretGate) {
    return (
      <>
        <GlobalStyle />
        <SecretGate
          onBack={() => setShowSecretGate(false)}
          onUnlock={() => setShowSecretWorld(true)}
        />
      </>
    );
  }
  if (activeItem?.entityType === 'project') {
    return (
      <>
        <GlobalStyle />
        <ProjectSpecificationPage projectData={activeItem} onBack={clearActive} />
      </>
    );
  }
  if (activeItem?.entityType === 'credential') {
    return (
      <>
        <GlobalStyle />
        <ProfessionalCredential credentialData={activeItem} onBack={clearActive} />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />

      {showGestureModal && (
        <GestureNavModal
          onClose={() => setShowGestureModal(false)}
          onConfirm={handleGestureConfirm}
          currentStatus={gestureNavStatus}
        />
      )}

      <Header>
        <Brand>
          <Dot />
          <BrandName>Hello, I'm <em>Archana Timilsina</em></BrandName>
        </Brand>
        <HeaderActions>
          <GestureNavBtn
            $active={gestureEnabled}
            onClick={handleGestureNavBtnClick}
            title={gestureEnabled ? 'Gesture Nav is ON — click to configure' : 'Click to enable Gesture Navigation'}
          >
            <span className="indicator" />
            Gesture Nav
          </GestureNavBtn>
          <GithubBadge href="https://github.com/archanatimilsina" target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </GithubBadge>
        </HeaderActions>
      </Header>

      <MainLayout>
        <LeftCol>
          <Section>
            <SectionLabel>Technical Ecosystem</SectionLabel>
            <CardGrid>
              {skills.map((cat, i) => (
                <Card key={i} $skill>
                  <CardTop>
                    <CardTitle style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>{cat.title}</CardTitle>
                    <PillRow>{cat.pills.map((p, j) => <Pill key={j}>{p}</Pill>)}</PillRow>
                  </CardTop>
                </Card>
              ))}
            </CardGrid>
          </Section>

          <ProjectsSection onCardClick={handleCardClick} />
          <CredentialsSection onCardClick={handleCardClick} />
        </LeftCol>

        <RightCol>
          <CharPanel>
            <ImgWrap>
              <CharImg src={charImg} alt="Archana Timilsina" />
            </ImgWrap>
            <NamePlate>
              <NameText>Archana Timilsina</NameText>
              <RoleText>Full-Stack Developer · Test Automation · Nepal</RoleText>
            </NamePlate>
          </CharPanel>
        </RightCol>
      </MainLayout>
    </>
  );
}






const float = keyframes`
  0%   { transform: translateY(0px) rotate(0deg); }
  50%  { transform: translateY(-25px) rotate(30deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const overlayFadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const modalSlideIn = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;
const floatSlow = keyframes`
  0%   { transform: translateY(0px) rotate(-1deg); }
  50%  { transform: translateY(-14px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(-1deg); }
`;
const wrongShake = keyframes`
  0%,100% { transform: translateX(0); border-color: #d8d4cc; }
  20%     { transform: translateX(-7px); border-color: #e74c3c; }
  40%     { transform: translateX(7px);  border-color: #e74c3c; }
  60%     { transform: translateX(-5px); border-color: #e74c3c; }
  80%     { transform: translateX(5px);  border-color: #e74c3c; }
`;
const subtlePulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.7; }
`;
const spinAnim = keyframes`
  to { transform: rotate(360deg); }
`;
const shimmerAnim = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;



const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #f6f5f0;
    color: #1a1a2e;
    font-family: 'DM Sans', system-ui, sans-serif;
    line-height: 1.65;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #f6f5f0; }
  ::-webkit-scrollbar-thumb { background: #c8c3b8; border-radius: 8px; }
  ::-webkit-scrollbar-thumb:hover { background: #2d6a4f; }
`;

const Header = styled.header`
  width: 100%;
  background: #f6f5f0;
  border-bottom: 2px solid #1a1a2e;
  padding: 1.1rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
`;
const Brand = styled.div`display: flex; align-items: center; gap: 0.75rem;`;
const Dot = styled.div`width: 11px; height: 11px; background: #2d6a4f; border-radius: 50%;`;
const BrandName = styled.span`
  font-family: 'Syne', sans-serif; font-size: 1.15rem; font-weight: 800;
  color: #1a1a2e; letter-spacing: -0.3px;
  em { font-style: normal; color: #2d6a4f; }
`;
const HeaderActions = styled.div`display: flex; align-items: center; gap: 0.75rem;`;
const GestureNavBtn = styled.button`
  font-family: 'Syne', sans-serif; font-size: 0.8rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px; cursor: pointer;
  border: 2px solid #1a1a2e; padding: 0.4rem 0.9rem; border-radius: 100px;
  transition: all 0.2s ease; display: flex; align-items: center; gap: 0.4rem;
  background: ${p => p.$active ? '#1a1a2e' : 'transparent'};
  color: ${p => p.$active ? '#f6f5f0' : '#1a1a2e'};
  &:hover {
    background: ${p => p.$active ? '#2d6a4f' : '#1a1a2e'};
    border-color: ${p => p.$active ? '#2d6a4f' : '#1a1a2e'};
    color: #f6f5f0;
  }
  span.indicator {
    width: 7px; height: 7px; border-radius: 50%;
    background: ${p => p.$active ? '#52d68a' : '#c8c3b8'};
    display: inline-block;
    box-shadow: ${p => p.$active ? '0 0 6px rgba(82,214,138,0.7)' : 'none'};
    transition: all 0.2s ease;
  }
`;
const GithubBadge = styled.a`
  font-family: 'Syne', sans-serif; font-size: 0.8rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px; color: #1a1a2e;
  text-decoration: none; border: 2px solid #1a1a2e; padding: 0.4rem 0.9rem;
  border-radius: 100px; transition: all 0.2s ease; background: transparent;
  &:hover { background: #1a1a2e; color: #f6f5f0; }
`;


const GestureToast = styled.div`
  position: fixed;
  bottom: 2.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(15, 23, 42, 0.93);
  color: #f8fafc;
  padding: 0.65rem 1.5rem;
  border-radius: 100px;
  font-family: 'Syne', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  letter-spacing: 0.3px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  animation: ${fadeUp} 0.2s ease forwards;
`;
const ToastScore = styled.span`
  font-size: 0.68rem;
  opacity: 0.55;
  font-weight: 600;
`;

const GestureDisabledBanner = styled.div`
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: #ffffff;
  border: 1.5px solid #d8d4cc;
  border-radius: 100px;
  padding: 0.45rem 1.25rem;
  font-family: 'Syne', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #7a7567;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(26,26,46,0.07);
  animation: ${fadeUp} 0.3s ease forwards;
`;


const ModalOverlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(26,26,46,0.55); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
  z-index: 999; padding: 1.5rem;
  animation: ${overlayFadeIn} 0.2s ease forwards;
`;
const ModalBox = styled.div`
  background: #ffffff; border: 1.5px solid #d8d4cc; border-radius: 20px;
  padding: 2.25rem 2.5rem 2rem; width: 100%; max-width: 440px;
  box-shadow: 0 24px 60px rgba(26,26,46,0.18); position: relative;
  animation: ${modalSlideIn} 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
`;
const ModalCloseBtn = styled.button`
  position: absolute; top: 1rem; right: 1rem;
  background: #f6f5f0; border: 1.5px solid #d8d4cc;
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 1rem; color: #7a7567; transition: all 0.2s ease;
  &:hover { background: #1a1a2e; color: #f6f5f0; border-color: #1a1a2e; }
`;
const ModalIconWrap = styled.div`
  width: 52px; height: 52px; background: #f6f5f0; border: 1.5px solid #d8d4cc;
  border-radius: 14px; display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; margin-bottom: 1.25rem;
`;
const ModalTitle = styled.h3`
  font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 800;
  color: #1a1a2e; margin-bottom: 0.5rem; letter-spacing: -0.02em; line-height: 1.2;
`;
const ModalDesc = styled.p`
  font-size: 0.88rem; color: #7a7567; line-height: 1.6; margin-bottom: 1.25rem;
`;

const ModalCurrentStatus = styled.div`
  display: inline-flex; align-items: center; gap: 0.45rem;
  background: #f6f5f0; border: 1.5px solid #d8d4cc; border-radius: 100px;
  padding: 0.3rem 0.75rem; margin-bottom: 1.5rem;
  font-family: 'Syne', sans-serif; font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px; color: #7a7567;
  span.status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: ${p => p.$active ? '#52d68a' : '#c8c3b8'};
    box-shadow: ${p => p.$active ? '0 0 6px rgba(82,214,138,0.7)' : 'none'};
    display: inline-block;
  }
`;
const ModalHowTo = styled.p`
  font-size: 0.78rem; color: #7a7567; line-height: 1.55;
  margin-bottom: 1.5rem;
  strong { color: #1a1a2e; }
`;
const ModalBtnRow = styled.div`display: flex; gap: 0.75rem;`;
const ModalBtnYes = styled.button`
  flex: 1; padding: 0.75rem 1rem; background: #1a1a2e; color: #f6f5f0;
  border: 2px solid #1a1a2e; border-radius: 100px;
  font-family: 'Syne', sans-serif; font-size: 0.85rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s ease; letter-spacing: 0.3px;
  &:hover { background: #2d6a4f; border-color: #2d6a4f; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(45,106,79,0.25); }
  &:active { transform: translateY(0); }
`;
const ModalBtnNo = styled.button`
  flex: 1; padding: 0.75rem 1rem; background: transparent; color: #7a7567;
  border: 1.5px solid #d8d4cc; border-radius: 100px;
  font-family: 'Syne', sans-serif; font-size: 0.85rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s ease;
  &:hover { border-color: #1a1a2e; color: #1a1a2e; transform: translateY(-2px); }
  &:active { transform: translateY(0); }
`;


const SecretGatePage = styled.div`
  min-height: 100vh; background: #f6f5f0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2rem; position: relative; overflow: hidden;
  &::before {
    content: ''; position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(26,26,46,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(26,26,46,0.04) 1px, transparent 1px);
    background-size: 52px 52px; pointer-events: none;
  }
`;
const GateBackBtn = styled.button`
  position: fixed; top: 1.25rem; left: 1.5rem;
  background: transparent; border: 2px solid #1a1a2e; border-radius: 100px;
  color: #1a1a2e; font-family: 'Syne', sans-serif; font-size: 0.75rem;
  font-weight: 700; letter-spacing: 1px; padding: 0.4rem 1rem;
  cursor: pointer; transition: all 0.2s ease; z-index: 10; text-transform: uppercase;
  &:hover { background: #1a1a2e; color: #f6f5f0; }
`;
const GateGlyph = styled.div`
  font-size: 4.5rem; margin-bottom: 1.25rem;
  animation: ${floatSlow} 4s ease-in-out infinite;
  user-select: none; line-height: 1;
`;
const GateTitle = styled.h1`
  font-family: 'Syne', sans-serif; font-size: clamp(1.75rem, 4vw, 2.6rem);
  font-weight: 800; color: #1a1a2e; letter-spacing: -0.03em;
  text-align: center; line-height: 1.15; margin-bottom: 0.5rem;
  span { color: #2d6a4f; }
`;
const GateSubtitle = styled.p`
  font-family: 'Syne', sans-serif; font-size: 0.7rem; color: #7a7567;
  letter-spacing: 3px; text-align: center; text-transform: uppercase;
  margin-bottom: 2.5rem; animation: ${subtlePulse} 3s ease-in-out infinite;
`;
const GateCard = styled.div`
  background: #ffffff; border: 1.5px solid #d8d4cc; border-radius: 20px;
  padding: 2rem 2.5rem; width: 100%; max-width: 440px;
  box-shadow: 0 8px 32px rgba(26,26,46,0.07);
  animation: ${modalSlideIn} 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
  position: relative; z-index: 2;
`;
const GateCardTitle = styled.p`
  font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700;
  color: #1a1a2e; margin-bottom: 0.5rem; line-height: 1.45;
`;
const GateCardDesc = styled.p`
  font-size: 0.88rem; color: #7a7567; line-height: 1.6; margin-bottom: 1.5rem;
`;
const GateAreYouRow = styled.div`
  display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
`;
const GateAreYouLabel = styled.span`
  font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700; color: #1a1a2e;
`;
const GateYesBtn = styled.button`
  padding: 0.45rem 1.25rem; background: #1a1a2e; color: #f6f5f0;
  border: 2px solid #1a1a2e; border-radius: 100px;
  font-family: 'Syne', sans-serif; font-size: 0.82rem; font-weight: 700;
  cursor: pointer; letter-spacing: 0.5px; transition: all 0.2s ease;
  &:hover { background: #2d6a4f; border-color: #2d6a4f; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(45,106,79,0.25); }
  &:active { transform: translateY(0); }
`;
const GateNoBtn = styled.button`
  padding: 0.45rem 1.25rem; background: transparent; color: #7a7567;
  border: 1.5px solid #d8d4cc; border-radius: 100px;
  font-family: 'Syne', sans-serif; font-size: 0.82rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s ease;
  &:hover { border-color: #1a1a2e; color: #1a1a2e; }
`;
const DreamInputWrap = styled.div`
  display: flex; gap: 0.5rem; margin-top: 0.25rem;
  animation: ${fadeUp} 0.3s ease forwards;
`;
const DreamInput = styled.input`
  flex: 1; background: #f6f5f0; border: 1.5px solid #d8d4cc; border-radius: 100px;
  padding: 0.6rem 1.1rem; font-family: 'Syne', sans-serif; font-size: 0.9rem;
  font-weight: 700; color: #1a1a2e; outline: none; letter-spacing: 1px;
  transition: border-color 0.2s;
  &::placeholder { color: #c8c3b8; font-weight: 400; letter-spacing: 0; }
  &:focus { border-color: #2d6a4f; background: #ffffff; }
  &.wrong { animation: ${wrongShake} 0.4s ease forwards; border-color: #e74c3c; }
`;
const DreamArrowBtn = styled.button`
  width: 42px; height: 42px; background: #1a1a2e; border: none; border-radius: 50%;
  color: #f6f5f0; font-size: 1.1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: all 0.2s ease;
  &:hover { background: #2d6a4f; transform: scale(1.08); box-shadow: 0 6px 16px rgba(45,106,79,0.3); }
  &:active { transform: scale(0.95); }
`;
const DreamHint = styled.p`
  font-family: 'Syne', sans-serif; font-size: 0.65rem; color: #c8c3b8;
  letter-spacing: 1.5px; margin-top: 0.6rem; text-align: center; text-transform: uppercase;
`;
const GateLockBadge = styled.div`
  display: inline-flex; align-items: center; gap: 0.4rem;
  background: #eceae3; border: 1.5px solid #d8d4cc; border-radius: 100px;
  padding: 0.3rem 0.75rem; font-family: 'Syne', sans-serif; font-size: 0.65rem;
  font-weight: 700; color: #7a7567; letter-spacing: 1.5px; text-transform: uppercase;
  margin-bottom: 1.25rem;
  span { width: 6px; height: 6px; background: #2d6a4f; border-radius: 50%;
    display: inline-block; animation: ${subtlePulse} 2s ease infinite; }
`;

const MainLayout = styled.main`
  max-width: 1340px; margin: 0 auto;
  padding: 3.5rem 2.5rem 6rem;
  display: grid; grid-template-columns: 1fr; gap: 4.5rem;
  animation: ${fadeUp} 0.5s ease forwards;
  @media (min-width: 1060px) { grid-template-columns: 1fr 320px; }
`;
const LeftCol     = styled.div`display: flex; flex-direction: column; gap: 4.5rem;`;
const Section     = styled.section`display: flex; flex-direction: column;`;
const SectionLabel = styled.h2`
  font-family: 'Syne', sans-serif; font-size: 0.75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 3px; color: #7a7567;
  margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;
  &::after { content: ''; flex: 1; height: 1px; background: #d8d4cc; }
`;
const CardGrid    = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;
`;
const Card        = styled.div`
  background: ${p => p.$skill ? '#eceae3' : '#ffffff'};
  border: 1.5px solid #d8d4cc; border-radius: 16px; padding: 1.6rem;
  cursor: ${p => p.$clickable ? 'pointer' : 'default'};
  display: flex; flex-direction: column; justify-content: space-between;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  ${p => p.$clickable && `
    &:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(26,26,46,0.1); border-color: #2d6a4f; }
  `}
`;
const CardTop     = styled.div``;
const CardMeta    = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;`;
const Tag         = styled.span`
  font-family: 'Syne', sans-serif; font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px; color: #2d6a4f;
  background: #d8f3dc; padding: 0.3rem 0.7rem; border-radius: 100px;
`;
const DurationTag = styled.span`
  font-family: 'Syne', sans-serif; font-size: 0.72rem; font-weight: 700;
  color: #7a7567; letter-spacing: 0.5px;
`;
const CardTitle   = styled.h3`
  font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 800;
  color: #1a1a2e; margin-bottom: 0.3rem; line-height: 1.2;
`;
const CardSub     = styled.p`
  font-size: 0.9rem; color: #7a7567; font-weight: 400; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
`;
const CredentialType = styled.span`
  font-family: 'Syne', sans-serif; font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px; color: #2d6a4f;
  display: block; margin-bottom: 0.2rem;
`;
const CardFooter  = styled.div`
  margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eceae3;
  display: flex; justify-content: space-between; align-items: center;
  font-family: 'Syne', sans-serif; font-size: 0.8rem; font-weight: 700;
  color: #2d6a4f; letter-spacing: 0.5px;
  span.arrow { transition: transform 0.2s ease; }
  ${Card}:hover & span.arrow { transform: translateX(5px); }
`;
const PillRow     = styled.div`display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.1rem;`;
const Pill        = styled.span`
  font-size: 0.82rem; font-weight: 500; color: #1a1a2e;
  background: #ffffff; border: 1.5px solid #d8d4cc;
  padding: 0.3rem 0.75rem; border-radius: 100px;
`;
const RightCol    = styled.div`position: sticky; top: 5.5rem; height: fit-content;`;
const CharPanel   = styled.div`
  background: #ffffff; border: 1.5px solid #d8d4cc; border-radius: 20px;
  padding: 1.25rem; box-shadow: 0 8px 32px rgba(26,26,46,0.07);
`;
const ImgWrap     = styled.div`
  width: 100%; aspect-ratio: 4/5; border-radius: 14px; overflow: hidden;
  background: #eceae3; animation: ${float} 6s ease-in-out infinite;
`;
const CharImg     = styled.img`width: 100%; height: 100%; object-fit: contain;`;
const NamePlate   = styled.div`margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #eceae3;`;
const NameText    = styled.h2`
  font-family: 'Syne', sans-serif; font-size: 1.35rem; font-weight: 800;
  color: #1a1a2e; line-height: 1.1;
`;
const RoleText    = styled.p`font-size: 0.88rem; color: #7a7567; margin-top: 0.3rem;`;

const LoadingRow = styled.div`
  display: flex; align-items: center; gap: 0.75rem; padding: 2.5rem 0;
`;
const Spinner = styled.div`
  width: 18px; height: 18px; border: 2px solid #d8d4cc;
  border-top-color: #2d6a4f; border-radius: 50%;
  animation: ${spinAnim} 0.7s linear infinite; flex-shrink: 0;
`;
const LoadText = styled.p`
  font-family: 'Syne', sans-serif; font-size: 0.72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 2px; color: #7a7567;
`;
const SkeletonCard = styled.div`
  background: linear-gradient(90deg, #eceae3 25%, #f6f5f0 50%, #eceae3 75%);
  background-size: 200% auto;
  animation: ${shimmerAnim} 1.4s linear infinite;
  border: 1.5px solid #d8d4cc; border-radius: 16px; height: 180px;
`;
const ErrorBanner = styled.div`
  display: flex; align-items: center; gap: 0.75rem;
  background: #fff5f5; border: 1.5px solid #fca5a5; border-radius: 12px;
  padding: 0.9rem 1.25rem; font-size: 0.85rem; color: #991b1b;
`;
const RetryBtn = styled.button`
  font-family: 'Syne', sans-serif; font-size: 0.72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
  background: transparent; color: #991b1b;
  border: 1.5px solid #fca5a5; border-radius: 100px;
  padding: 0.3rem 0.75rem; cursor: pointer; transition: all 0.2s ease; margin-left: auto;
  &:hover { background: #991b1b; color: #fff; border-color: #991b1b; }
`;
const EmptyState = styled.div`
  padding: 3rem 0; text-align: center;
  font-family: 'Syne', sans-serif; font-size: 0.82rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 2px; color: #c8c3b8;
`;