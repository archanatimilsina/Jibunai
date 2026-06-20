import React, { useEffect, useState, useCallback } from "react";
import styled, { createGlobalStyle, keyframes, css } from "styled-components";

import Drama from "./dramalist";
import GalleryPage from "./Gallery";
import Hobbies  from "./Hobbies";
import Goals from "./Goals";
import Notes    from "./Notes";
import WishList from "./WishList";
import MyDayLogPage from './Tellme';
import ChronosTaskFlow from './TodoArea'
import AboutMe from './AboutMe';
import ProjectsPage from './ProjectDetail';
import ProfessionalDevPage from './ProfessionalDev';
import MusicVibes from './music';
import GestureDraw from './GestureDraw';


const C = {
  bg:     "#f6f5f0",
  white:  "#ffffff",
  dark:   "#1a1a2e",
  green:  "#2d6a4f",
  border: "#d8d4cc",
  muted:  "#eceae3",
  soft:   "#7a7567",
  gold:   "#d4af37",
  accent: "#52d68a",
};
const API_BASE = import.meta.env.VITE_API_URL;
const BASE = `${API_BASE}/api`;
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

const float1 = keyframes`
  0%,100% { transform:translateY(0) rotate(-2deg); }
  50%      { transform:translateY(-18px) rotate(2deg); }
`;
const float2 = keyframes`
  0%,100% { transform:translateY(0) rotate(3deg); }
  50%      { transform:translateY(-24px) rotate(-1deg); }
`;
const float3 = keyframes`
  0%   { transform:translateY(0) rotate(0deg); }
  33%  { transform:translateY(-14px) rotate(4deg); }
  66%  { transform:translateY(-22px) rotate(-2deg); }
  100% { transform:translateY(0) rotate(0deg); }
`;
const FLOATS = [float1, float2, float3];

const sideIn = keyframes`
  0%   { transform:translateX(-110%); opacity:0; }
  65%  { transform:translateX(6px);   opacity:1; }
  100% { transform:translateX(0);     opacity:1; }
`;
const sideOut = keyframes`
  0%   { transform:translateX(0);     opacity:1; }
  100% { transform:translateX(-110%); opacity:0; }
`;
const burstCore = keyframes`
  0%   { transform:translate(-50%,-50%) scale(.15); opacity:1; filter:blur(0); }
  100% { transform:translate(-50%,-50%) scale(6);   opacity:0; filter:blur(14px); }
`;
const sparkleFly = keyframes`
  0%   { transform:translate(0,0) scale(1); opacity:1; }
  100% { transform:translate(var(--tx),var(--ty)) scale(0); opacity:0; }
`;
const ringPop = keyframes`
  0%   { transform:translate(-50%,-50%) scale(.3); opacity:.9; }
  100% { transform:translate(-50%,-50%) scale(5);  opacity:0; }
`;
const pulse = keyframes`
  0%,100% { opacity:1; }
  50%      { opacity:.55; }
`;
const fadeUp = keyframes`
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
`;

const cardSlideIn = keyframes`
  from { opacity:0; transform:translateX(-16px); }
  to   { opacity:1; transform:translateX(0); }
`;
const spin = keyframes`to { transform: rotate(360deg); }`;


const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  body {
    background:${C.bg};
    color:${C.dark};
    font-family:'DM Sans',system-ui,sans-serif;
    overflow-x:hidden;
    line-height:1.65;
  }
  ::-webkit-scrollbar { width:8px; }
  ::-webkit-scrollbar-track { background:${C.bg}; }
  ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:8px; }
  ::-webkit-scrollbar-thumb:hover { background:${C.green}; }
`;

const SECTIONS = [
  { id:"gallery",          icon:"🖼",  label:"Gallery",         group:"explore" },
  { id:"dramalist",        icon:"🎬",  label:"Drama List",      group:"explore" },
  { id:"hobbies",          icon:"🌿",  label:"Hobbies",         group:"explore" },
  { id:"goals",            icon:"🎯",  label:"Goals",           group:"life"    },
  { id:"notes",            icon:"📝",  label:"Notes",           group:"life"    },
  { id:"wishlist",         icon:"✨",  label:"Wish List",       group:"life"    },
  { id:"tellme",           icon:"🗣️",  label:"My day",          group:"life"    },
  { id:"todo",             icon:"🏋️",  label:"To do",           group:"life"    },
  { id:"aboutme",          icon:"🥰",  label:"about me",        group:"life"    },
  { id:"project",          icon:"👩‍💻",  label:"Project",         group:"life"    },
  { id:"professionalDev",  icon:"💆‍♀️",  label:"professionalDev", group:"life"    },
  { id:"music",            icon:"🎧",  label:"music",           group:"life"    },
  { id:"gestureDraw",      icon:"🎨",  label:"GestureDraw",     group:"life"    },
];


const TYPE_COLOR = {
  solo:        '#52d68a',
  group:       '#93c5fd',
  academic:    '#fbbf24',
  open_source: '#f9a8d4',
};

const TYPE_LABEL = {
  solo: 'Solo', group: 'Group', academic: 'Academic', open_source: 'Open Source',
};


const PD_COLOR = {
  Mentorship:     '#c084fc',
  Internship:     '#52d68a',
  Course:         '#fbbf24',
  Fellowship:     '#f97316',
  Session:        '#93c5fd',
  'Online Course':'#f9a8d4',
};


function SectionPage({ id, onBack }) {
  if (id === "gallery")         return <GalleryPage        onBack={onBack} />;
  if (id === "goals")           return <Goals              onBack={onBack} />;
  if (id === "hobbies")         return <Hobbies            onBack={onBack} />;
  if (id === "notes")           return <Notes              onBack={onBack} />;
  if (id === "wishlist")        return <WishList           onBack={onBack} />;
  if (id === "dramalist")       return <Drama              onBack={onBack} />;
  if (id === "tellme")          return <MyDayLogPage       onBack={onBack} />;
  if (id === "todo")            return <ChronosTaskFlow    onBack={onBack} />;
  if (id === "aboutme")         return <AboutMe            onBack={onBack} />;
  if (id === "project")         return <ProjectsPage       onBack={onBack} />;
  if (id === "professionalDev") return <ProfessionalDevPage onBack={onBack} />;
  if (id === "music")           return <MusicVibes         onBack={onBack} />;
  if (id === "gestureDraw")           return <GestureDraw         onBack={onBack} />;

  return (
    <PlaceholderWrap>
      <PlaceholderIcon>🚧</PlaceholderIcon>
      <PlaceholderTitle>{SECTIONS.find(s=>s.id===id)?.label} page</PlaceholderTitle>
      <PlaceholderDesc>
        This section is being built. Import and map your component in MyArea.jsx.
      </PlaceholderDesc>
      <PlaceholderBtn onClick={onBack}>← Back to Hero</PlaceholderBtn>
    </PlaceholderWrap>
  );
}



export default function MyArea({ onBack }) {
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [sidebarRendered, setSidebarRendered] = useState(false);
  const [activeSection,   setActiveSection]   = useState(null);
  const [burst,           setBurst]           = useState(false);
  const [sparkles,        setSparkles]        = useState([]);

  const [projects,   setProjects]   = useState([]);
  const [pdItems,    setPdItems]    = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      try {
        const [pRes, pdRes] = await Promise.all([
          fetch(`${BASE}/projectListView/`),
          fetch(`${BASE}/pdListView/`),
        ]);
        if (pRes.ok) {
          const d = await pRes.json();
          setProjects(Array.isArray(d) ? d : d.results || []);
        }
        if (pdRes.ok) {
          const d = await pdRes.json();
          setPdItems(Array.isArray(d) ? d : d.results || []);
        }
      } catch (err) {
        console.log(err)
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  const triggerBurst = useCallback(() => {
    setBurst(true);
    setSparkles(
      Array.from({ length: 60 }, (_, i) => ({
        id:    i,
        tx:    (Math.random() - .5) * 640,
        ty:    (Math.random() - .5) * 640,
        s:     5 + Math.random() * 8,
        d:     .6 + Math.random() * .9,
        color: i % 3 === 0 ? C.gold : i % 3 === 1 ? C.green : C.accent,
      }))
    );
    setTimeout(() => { setBurst(false); setSparkles([]); }, 1500);
  }, []);

  useEffect(() => {
    const CODE = "9988";
    let buf = "";
    const handler = async (e) => {
      if (!/^[0-9]$/.test(e.key)) return;
      if (["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) return;
      buf = (buf + e.key).slice(-CODE.length);
    if (buf.length === 4) {
  const allowed = await verifySecret('sidebar', buf);
  if (allowed) { buf = ''; triggerBurst(); setSidebarRendered(true); setSidebarOpen(true); }
}
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [triggerBurst]);

  const closeSidebar = () => {
    setSidebarOpen(false);
    setTimeout(() => setSidebarRendered(false), 350);
  };

  const handleNavClick = (id) => setActiveSection(id);
  const goHero = () => setActiveSection(null);

  const SidebarMarkup = (
    <Sidebar $open={sidebarOpen}>
      <SBTop>
        <SBTag>Access Level · Root</SBTag>
        <SBTitle>Control Panel</SBTitle>
      </SBTop>
      <SBNav>
        <SBGroupLabel>Explore</SBGroupLabel>
        {SECTIONS.filter(s=>s.group==="explore").map(item => (
          <SBItem key={item.id} $active={activeSection===item.id}
            onClick={() => handleNavClick(item.id)}>
            <span className="icon">{item.icon}</span>{item.label}
          </SBItem>
        ))}
        <SBDivider />
        <SBGroupLabel>My Life</SBGroupLabel>
        {SECTIONS.filter(s=>s.group==="life").map(item => (
          <SBItem key={item.id} $active={activeSection===item.id}
            onClick={() => handleNavClick(item.id)}>
            <span className="icon">{item.icon}</span>{item.label}
          </SBItem>
        ))}
        <SBDivider />
        <SBGroupLabel>Security</SBGroupLabel>
        <SBItem onClick={closeSidebar}>
          <span className="icon">🔒</span>Lock Sidebar
        </SBItem>
      </SBNav>
      <SBFooter>
        <SBAvatar>AT</SBAvatar>
        <div>
          <SBName>Archana Timilsina</SBName>
          <SBRole>Full-Stack · Nepal</SBRole>
        </div>
      </SBFooter>
    </Sidebar>
  );

  if (activeSection) {
    return (
      <>
        <GlobalStyle />
        {sidebarRendered && SidebarMarkup}
        <div style={{ marginLeft: sidebarOpen ? 268 : 0, transition:'margin-left .45s cubic-bezier(.34,1.56,.64,1)' }}>
          <SectionPage id={activeSection} onBack={goHero} />
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <PageWrap>

        {burst && <BurstCore />}
        {burst && [0,1,2].map(i => (
          <Ring key={i} $c={i%2===0?C.green:C.gold} style={{animationDelay:`${i*.14}s`}} />
        ))}
        {sparkles.map(s => (
          <Sparkle key={s.id} $s={s.s} $d={s.d}
            style={{"--tx":`${s.tx}px`,"--ty":`${s.ty}px`,
              left:"50%",top:"50%",background:s.color,boxShadow:`0 0 8px ${s.color}`}} />
        ))}

        <TopBar>
          <TBLeft>
            <GreenDot />
            <Brand>Archana's <em>Secret Space</em></Brand>
          </TBLeft>
          <TBRight>
            <StatusBadge><span />Private Area</StatusBadge>
            {onBack && <PillBtn onClick={onBack}>← Portfolio</PillBtn>}
          </TBRight>
        </TopBar>

        {sidebarRendered && SidebarMarkup}

        <Main $shifted={sidebarOpen}>
          <Hero>
            <HeroChip><span />Restricted Zone</HeroChip>
            <HeroTitle>Welcome <em>Archana</em></HeroTitle>
            <HeroSub>How was your day?</HeroSub>

          </Hero>

          <DataSection>

            {dataLoading && (
              <LoadingRow>
                <LoadSpinner />
                <LoadLabel>Fetching your work…</LoadLabel>
              </LoadingRow>
            )}

            {!dataLoading && (
              <>
                {projects.length > 0 && (
                  <DataBlock>
                    <BlockHeader>
                      <BlockTitle>Projects</BlockTitle>
                      <BlockCount>{projects.length}</BlockCount>
                      <BlockCTA onClick={() => handleNavClick('project')}>
                        Manage →
                      </BlockCTA>
                    </BlockHeader>

                    <ProjectsGrid>
                      {projects.map((p, i) => {
                        const color = TYPE_COLOR[p.project_type] || C.accent;
                        const features = Array.isArray(p.features) ? p.features : [];
                        return (
                          <ProjectCard key={p.id} $delay={i * 0.07}>
                            <PCTop>
                              <PCTypeBadge $color={color}>
                                {TYPE_LABEL[p.project_type] || p.project_type}
                              </PCTypeBadge>
                              {p.github_link && (
                                <PCGhLink href={p.github_link} target="_blank" rel="noopener noreferrer">
                                  ↗ GitHub
                                </PCGhLink>
                              )}
                            </PCTop>

                            <PCName>{p.name}</PCName>
                            <PCTech>{p.tech}</PCTech>

                            {p.description && (
                              <PCDesc>{p.description}</PCDesc>
                            )}

                            {features.length > 0 && (
                              <PCFeatures>
                                {features.slice(0, 3).map((f, fi) => (
                                  <PCFeature key={fi}>◈ {f}</PCFeature>
                                ))}
                                {features.length > 3 && (
                                  <PCFeature $muted>+{features.length - 3} more</PCFeature>
                                )}
                              </PCFeatures>
                            )}

                            {p.created_at && (
                              <PCDate>
                                {new Date(p.created_at).toLocaleDateString(undefined, { month:'short', year:'numeric' })}
                              </PCDate>
                            )}
                          </ProjectCard>
                        );
                      })}
                    </ProjectsGrid>
                  </DataBlock>
                )}

                {pdItems.length > 0 && (
                  <DataBlock>
                    <BlockHeader>
                      <BlockTitle>Professional Development</BlockTitle>
                      <BlockCount>{pdItems.length}</BlockCount>
                      <BlockCTA onClick={() => handleNavClick('professionalDev')}>
                        Manage →
                      </BlockCTA>
                    </BlockHeader>

                    <PDList>
                      {pdItems.map((pd, i) => {
                        const color = PD_COLOR[pd.name] || C.accent;
                        const learnings    = Array.isArray(pd.learnings)       ? pd.learnings       : [];
                        const skills       = Array.isArray(pd.skills_acquired)  ? pd.skills_acquired : [];
                        return (
                          <PDCard key={pd.id} $delay={i * 0.08} $color={color}>
                            <PDLeft $color={color} />
                            <PDBody>
                              <PDRow>
                                <PDTypeBadge $color={color}>{pd.name}</PDTypeBadge>
                                <PDDuration>{pd.duration}</PDDuration>
                              </PDRow>

                              <PDSubject>{pd.subject}</PDSubject>
                              <PDCompany>{pd.company}</PDCompany>

                              {learnings.length > 0 && (
                                <PDTagRow>
                                  {learnings.slice(0, 3).map((l, li) => (
                                    <PDTag key={li} $color={color}>{l}</PDTag>
                                  ))}
                                  {learnings.length > 3 && (
                                    <PDTag $muted>+{learnings.length - 3}</PDTag>
                                  )}
                                </PDTagRow>
                              )}

                              {skills.length > 0 && (
                                <PDSkillRow>
                                  {skills.slice(0, 4).map((s, si) => (
                                    <PDSkill key={si}>{s}</PDSkill>
                                  ))}
                                  {skills.length > 4 && (
                                    <PDSkill $muted>+{skills.length - 4}</PDSkill>
                                  )}
                                </PDSkillRow>
                              )}
                            </PDBody>

                            {pd.certificate_link && (
                              <PDCertLink href={pd.certificate_link} target="_blank" rel="noopener noreferrer">
                                🎓
                              </PDCertLink>
                            )}
                          </PDCard>
                        );
                      })}
                    </PDList>
                  </DataBlock>
                )}

                {projects.length === 0 && pdItems.length === 0 && (
                  <EmptyState>
                    <EmptyIcon>🌱</EmptyIcon>
                    <EmptyText>No projects or development entries yet.</EmptyText>
                    <EmptyHint>Use the sidebar to start adding your work.</EmptyHint>
                  </EmptyState>
                )}
              </>
            )}
          </DataSection>
        </Main>

      </PageWrap>
    </>
  );
}


const PageWrap = styled.div`
  min-height:100vh;
  background:${C.bg};
  position:relative;
  overflow:hidden;
  &::before {
    content:'';position:fixed;inset:0;
    background-image:
      linear-gradient(rgba(26,26,46,.04) 1px,transparent 1px),
      linear-gradient(90deg,rgba(26,26,46,.04) 1px,transparent 1px);
    background-size:52px 52px;pointer-events:none;z-index:0;
  }
`;

const TopBar  = styled.header`
  position:fixed;top:0;left:0;right:0;height:56px;
  background:${C.bg};border-bottom:2px solid ${C.dark};
  display:flex;align-items:center;justify-content:space-between;
  padding:0 2.5rem;z-index:300;
`;
const TBLeft  = styled.div`display:flex;align-items:center;gap:.75rem;`;
const TBRight = styled.div`display:flex;align-items:center;gap:.75rem;`;
const GreenDot = styled.div`
  width:11px;height:11px;background:${C.green};border-radius:50%;
  animation:${pulse} 2.5s ease infinite;
`;
const Brand = styled.span`
  font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
  color:${C.dark};letter-spacing:-.3px;
  em{font-style:normal;color:${C.green};}
`;
const PillBtn = styled.button`
  font-family:'Syne',sans-serif;font-size:.78rem;font-weight:700;
  text-transform:uppercase;letter-spacing:1px;
  color:${C.dark};background:transparent;
  border:2px solid ${C.dark};padding:.38rem .9rem;border-radius:100px;
  cursor:pointer;transition:all .2s ease;
  &:hover{background:${C.dark};color:${C.bg};}
`;
const StatusBadge = styled.div`
  display:flex;align-items:center;gap:.4rem;
  font-family:'Syne',sans-serif;font-size:.68rem;font-weight:700;
  text-transform:uppercase;letter-spacing:1px;color:${C.soft};
  border:1.5px solid ${C.border};background:${C.muted};
  padding:.28rem .75rem;border-radius:100px;
  span{width:6px;height:6px;background:${C.green};border-radius:50%;
    display:inline-block;box-shadow:0 0 6px rgba(45,106,79,.55);
    animation:${pulse} 2s ease infinite;}
`;

const Sidebar = styled.aside`
  position:fixed;top:56px;left:0;bottom:0;width:268px;
  background:${C.dark};
  border-right:1px solid rgba(255,255,255,.06);
  z-index:250;display:flex;flex-direction:column;overflow:hidden;
  animation:${p=>p.$open
    ? css`${sideIn} .5s cubic-bezier(.34,1.56,.64,1) forwards`
    : css`${sideOut} .32s ease forwards`};
`;
const SBTop = styled.div`
  padding:1.5rem 1.25rem 1rem;
  border-bottom:1px solid rgba(255,255,255,.07);
`;
const SBTag = styled.div`
  font-family:'Syne',sans-serif;font-size:.58rem;font-weight:700;
  text-transform:uppercase;letter-spacing:3px;
  color:rgba(255,255,255,.25);margin-bottom:.25rem;
`;
const SBTitle = styled.div`
  font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:800;color:${C.bg};
`;
const SBUnlocked = styled.div`
  margin-top:.55rem;display:inline-flex;align-items:center;gap:.4rem;
  background:rgba(45,106,79,.18);border:1px solid rgba(45,106,79,.38);
  border-radius:100px;padding:.2rem .6rem;
  font-family:'Syne',sans-serif;font-size:.6rem;font-weight:700;
  letter-spacing:1px;color:#52d68a;text-transform:uppercase;
  span{width:6px;height:6px;background:#52d68a;border-radius:50%;
    display:inline-block;box-shadow:0 0 6px rgba(82,214,138,.7);
    animation:${pulse} 1.8s ease infinite;}
`;
const SBNav = styled.nav`
  flex:1;padding:.75rem 0;overflow-y:auto;
  &::-webkit-scrollbar{width:4px;}
  &::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px;}
`;
const SBGroupLabel = styled.div`
  font-family:'Syne',sans-serif;font-size:.56rem;font-weight:700;
  text-transform:uppercase;letter-spacing:2.5px;
  color:rgba(255,255,255,.18);padding:0 1.25rem;margin:.85rem 0 .3rem;
`;
const SBItem = styled.div`
  display:flex;align-items:center;gap:.7rem;
  padding:.6rem 1.25rem;cursor:pointer;
  border-left:2px solid ${p=>p.$active?C.green:'transparent'};
  background:${p=>p.$active?'rgba(45,106,79,.18)':'transparent'};
  transition:all .16s ease;
  font-family:'DM Sans',sans-serif;font-size:.88rem;
  color:${p=>p.$active?C.bg:'rgba(246,245,240,.38)'};
  font-weight:${p=>p.$active?'500':'400'};
  .icon{font-size:.95rem;width:20px;text-align:center;}
  &:hover{background:rgba(255,255,255,.06);color:${C.bg};
    border-left-color:rgba(45,106,79,.4);}
`;
const SBDivider = styled.div`
  height:1px;background:rgba(255,255,255,.07);margin:.35rem 1.25rem;
`;
const SBFooter = styled.div`
  padding:1rem 1.25rem;border-top:1px solid rgba(255,255,255,.07);
  display:flex;align-items:center;gap:.75rem;
`;
const SBAvatar = styled.div`
  width:34px;height:34px;border-radius:10px;
  background:linear-gradient(135deg,${C.green},#52d68a);
  display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-size:.82rem;font-weight:800;color:#fff;flex-shrink:0;
`;
const SBName = styled.div`font-family:'Syne',sans-serif;font-size:.83rem;font-weight:700;color:${C.bg};`;
const SBRole = styled.div`font-size:.7rem;color:rgba(246,245,240,.3);margin-top:.1rem;`;

const Main = styled.main`
  margin-top:56px;
  margin-left:${p=>p.$shifted?'268px':'0'};
  min-height:calc(100vh - 56px);
  position:relative;z-index:1;
  transition:margin-left .45s cubic-bezier(.34,1.56,.64,1);
`;

const Hero = styled.div`
  height:calc(100vh - 56px);
  position:relative;display:flex;flex-direction:column;
  align-items:center;padding-top:3.75rem;overflow:hidden;
`;
const HeroChip = styled.div`
  display:inline-flex;align-items:center;gap:.5rem;
  font-family:'Syne',sans-serif;font-size:.66rem;font-weight:700;
  text-transform:uppercase;letter-spacing:2.5px;color:${C.soft};
  border:1.5px solid ${C.border};background:${C.white};
  padding:.3rem .85rem;border-radius:100px;margin-bottom:1.2rem;z-index:5;
  span{width:6px;height:6px;background:${C.green};border-radius:50%;
    display:inline-block;animation:${pulse} 2s ease infinite;}
`;
const HeroTitle = styled.h1`
  font-family:'Syne',sans-serif;
  font-size:clamp(2rem,5vw,3.6rem);font-weight:800;
  color:${C.dark};letter-spacing:-.04em;line-height:1.05;
  text-align:center;z-index:5;
  em{font-style:normal;color:${C.green};}
`;
const HeroSub = styled.p`
  font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;
  text-transform:uppercase;letter-spacing:3px;color:${C.soft};
  margin-top:.7rem;z-index:5;
`;
const HeroHint = styled.div`
  margin-top:1.4rem;
  display:inline-flex;align-items:center;gap:.5rem;
  background:${C.white};border:1.5px solid ${C.border};
  border-radius:100px;padding:.38rem 1rem;
  font-family:'Syne',sans-serif;font-size:.68rem;font-weight:700;
  text-transform:uppercase;letter-spacing:1.5px;color:${C.soft};z-index:5;
  strong{color:${C.dark};margin-left:4px;}
`;

const BurstCore = styled.div`
  position:fixed;left:50%;top:50%;width:22px;height:22px;border-radius:50%;
  background:radial-gradient(circle,${C.gold},${C.green},transparent);
  animation:${burstCore} 1.1s ease-out forwards;
  z-index:800;pointer-events:none;
`;
const Sparkle   = styled.div`
  position:fixed;border-radius:50%;
  width:${p=>p.$s}px;height:${p=>p.$s}px;
  animation:${sparkleFly} ${p=>p.$d}s ease-out forwards;
  z-index:810;pointer-events:none;
`;
const Ring      = styled.div`
  position:fixed;left:50%;top:50%;
  width:48px;height:48px;border-radius:50%;
  border:2px solid ${p=>p.$c};
  animation:${ringPop} 1s ease-out forwards;
  z-index:790;pointer-events:none;
`;

const PlaceholderWrap  = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:calc(100vh - 56px);padding:3rem;text-align:center;
`;
const PlaceholderIcon  = styled.div`font-size:3.5rem;margin-bottom:1rem;`;
const PlaceholderTitle = styled.h2`
  font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;
  color:${C.dark};margin-bottom:.5rem;letter-spacing:-.02em;
`;
const PlaceholderDesc  = styled.p`font-size:.9rem;color:${C.soft};max-width:380px;line-height:1.65;margin-bottom:1.75rem;`;
const PlaceholderBtn   = styled.button`
  font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;
  text-transform:uppercase;letter-spacing:1px;
  background:${C.dark};color:${C.bg};border:2px solid ${C.dark};
  padding:.5rem 1.25rem;border-radius:100px;cursor:pointer;transition:all .2s ease;
  &:hover{background:${C.green};border-color:${C.green};}
`;


const DataSection = styled.section`
  position:relative;z-index:2;
  padding:3.5rem 3rem 6rem;
  background:${C.bg};
  border-top:2px solid ${C.dark};
`;

const LoadingRow = styled.div`
  display:flex;align-items:center;justify-content:center;gap:1rem;
  padding:4rem 0;
`;
const LoadSpinner = styled.div`
  width:22px;height:22px;
  border:2px solid ${C.border};
  border-top-color:${C.green};
  border-radius:50%;
  animation:${spin} .7s linear infinite;
`;
const LoadLabel = styled.p`
  font-family:'Syne',sans-serif;font-size:.78rem;font-weight:700;
  text-transform:uppercase;letter-spacing:2px;color:${C.soft};
`;

const DataBlock = styled.div`
  margin-bottom:4rem;
  animation:${fadeUp} .6s ease both;
`;

const BlockHeader = styled.div`
  display:flex;align-items:center;gap:.85rem;
  margin-bottom:1.75rem;
  padding-bottom:1rem;
  border-bottom:1.5px solid ${C.border};
`;
const BlockIcon = styled.span`font-size:1.3rem;`;
const BlockTitle = styled.h2`
  font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
  color:${C.dark};letter-spacing:-.03em;flex:1;
`;
const BlockCount = styled.span`
  font-family:'Syne',sans-serif;font-size:.68rem;font-weight:700;
  background:${C.muted};border:1.5px solid ${C.border};
  color:${C.soft};padding:.22rem .65rem;border-radius:100px;
  letter-spacing:.05em;
`;
const BlockCTA = styled.button`
  font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;
  text-transform:uppercase;letter-spacing:1.5px;
  color:${C.green};background:transparent;border:1.5px solid ${C.green};
  padding:.32rem .85rem;border-radius:100px;cursor:pointer;
  transition:all .2s ease;
  &:hover{background:${C.green};color:${C.white};}
`;

const ProjectsGrid = styled.div`
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));
  gap:1.1rem;
`;

const ProjectCard = styled.div`
  background:${C.white};
  border:1.5px solid ${C.border};
  border-radius:16px;
  padding:1.4rem;
  display:flex;flex-direction:column;gap:.75rem;
  animation:${cardSlideIn} .5s ease both;
  animation-delay:${p=>p.$delay}s;
  transition:border-color .2s,box-shadow .2s,transform .2s;
  &:hover{
    border-color:${C.green};
    box-shadow:0 10px 36px rgba(26,26,46,.09);
    transform:translateY(-3px);
  }
`;
const PCTop = styled.div`display:flex;justify-content:space-between;align-items:center;`;
const PCTypeBadge = styled.span`
  font-family:'Syne',sans-serif;font-size:.6rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.1em;
  color:${p=>p.$color};
  background:${p=>p.$color}18;
  border:1px solid ${p=>p.$color}40;
  padding:.2rem .6rem;border-radius:100px;
`;
const PCGhLink = styled.a`
  font-family:'Syne',sans-serif;font-size:.65rem;font-weight:700;
  color:${C.green};text-decoration:none;letter-spacing:.05em;
  &:hover{text-decoration:underline;}
`;
const PCName = styled.h3`
  font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;
  color:${C.dark};letter-spacing:-.02em;line-height:1.2;
`;
const PCTech = styled.p`
  font-size:.78rem;color:${C.green};font-weight:500;letter-spacing:.03em;
`;
const PCDesc = styled.p`
  font-size:.83rem;color:${C.soft};line-height:1.6;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
`;
const PCFeatures = styled.ul`list-style:none;display:flex;flex-direction:column;gap:.28rem;`;
const PCFeature = styled.li`
  font-size:.77rem;
  color:${p=>p.$muted?C.soft:C.dark};
  opacity:${p=>p.$muted?.55:.8};
`;
const PCDate = styled.span`
  font-size:.68rem;color:${C.soft};opacity:.6;margin-top:auto;
  font-family:'Syne',sans-serif;font-weight:600;letter-spacing:.05em;
`;

const PDList = styled.div`
  display:flex;flex-direction:column;gap:.9rem;
`;

const PDCard = styled.div`
  background:${C.white};
  border:1.5px solid ${C.border};
  border-radius:14px;
  display:flex;align-items:stretch;overflow:hidden;
  animation:${cardSlideIn} .5s ease both;
  animation-delay:${p=>p.$delay}s;
  transition:border-color .2s,box-shadow .2s,transform .2s;
  &:hover{
    border-color:${p=>p.$color}66;
    box-shadow:0 8px 30px rgba(26,26,46,.08);
    transform:translateX(4px);
  }
`;
const PDLeft = styled.div`
  width:4px;flex-shrink:0;
  background:${p=>p.$color};
  border-radius:0;
`;
const PDBody = styled.div`
  flex:1;padding:1.1rem 1.25rem;
  display:flex;flex-direction:column;gap:.55rem;
`;
const PDRow = styled.div`display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;`;
const PDTypeBadge = styled.span`
  font-family:'Syne',sans-serif;font-size:.6rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.08em;
  color:${p=>p.$color};
  background:${p=>p.$color}15;
  border:1px solid ${p=>p.$color}35;
  padding:.18rem .55rem;border-radius:100px;
`;
const PDDuration = styled.span`
  font-family:'Syne',sans-serif;font-size:.62rem;font-weight:600;
  color:${C.soft};letter-spacing:.05em;
`;
const PDSubject = styled.h3`
  font-family:'Syne',sans-serif;font-size:.95rem;font-weight:800;
  color:${C.dark};letter-spacing:-.02em;
`;
const PDCompany = styled.p`
  font-size:.8rem;color:${C.soft};font-weight:500;
`;
const PDTagRow = styled.div`display:flex;flex-wrap:wrap;gap:.35rem;`;
const PDTag = styled.span`
  font-size:.7rem;font-weight:500;
  background:${p=>p.$muted?C.muted:`${C.muted}`};
  border:1px solid ${C.border};
  color:${p=>p.$muted?C.soft:C.dark};
  padding:.15rem .5rem;border-radius:100px;
  opacity:${p=>p.$muted?.6:1};
`;
const PDSkillRow = styled.div`display:flex;flex-wrap:wrap;gap:.3rem;`;
const PDSkill = styled.span`
  font-family:'Syne',sans-serif;font-size:.62rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.05em;
  background:${C.dark};color:${C.bg};
  padding:.12rem .45rem;border-radius:6px;
  opacity:${p=>p.$muted?.5:1};
`;
const PDCertLink = styled.a`
  display:flex;align-items:center;justify-content:center;
  padding:0 1.1rem;flex-shrink:0;
  font-size:1.15rem;text-decoration:none;
  border-left:1px solid ${C.border};
  color:${C.gold};
  transition:background .2s;
  &:hover{background:${C.muted};}
`;

const EmptyState = styled.div`
  display:flex;flex-direction:column;align-items:center;
  padding:5rem 2rem;gap:.75rem;text-align:center;
`;
const EmptyIcon = styled.div`font-size:2.5rem;`;
const EmptyText = styled.p`
  font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;
  color:${C.dark};letter-spacing:-.01em;
`;
const EmptyHint = styled.p`font-size:.85rem;color:${C.soft};`;