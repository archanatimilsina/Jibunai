import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';


const C = {
  bg:      '#fafaf8',
  white:   '#ffffff',
  dark:    '#18181b',
  green:   '#10b981',
  greenLt: '#f0fdf8',
  border:  '#e4e4e7',
  muted:   '#f4f4f5',
  soft:    '#71717a',
  gold:    '#d4af37',
};

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: ${C.bg};
    font-family: 'DM Sans', sans-serif;
    color: ${C.dark};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  a { color: inherit; text-decoration: none; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 8px; }
  ::-webkit-scrollbar-thumb:hover { background: ${C.green}; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  }
`;

const fadeUp = keyframes`from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}`;
const pulse  = keyframes`0%,100%{opacity:1;}50%{opacity:.5;}`;
const drift1 = keyframes`0%,100%{transform:translateY(0) rotate(-3deg);}50%{transform:translateY(-16px) rotate(3deg);}`;
const drift2 = keyframes`0%,100%{transform:translateY(0) rotate(4deg);}50%{transform:translateY(-22px) rotate(-2deg);}`;
const drift3 = keyframes`0%,100%{transform:translateY(0) rotate(0deg);}33%{transform:translateY(-12px) rotate(3deg);}66%{transform:translateY(-20px) rotate(-3deg);}`;
const blink  = keyframes`0%,100%{opacity:1;}50%{opacity:0;}`;
const marquee = keyframes`from{transform:translateX(0);}to{transform:translateX(-50%);}`;

const WORDS = ['dramas.', 'goals.', 'wishes.', 'hobbies.', 'daily notes.', 'songs on repeat.', 'small wins.'];

function useRotatingWord(words, interval = 2000) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return words[i];
}

const SECTIONS = [
  { path: '/tellme',      icon: '🗣️', label: 'My Day',      desc: 'A line for how today actually went — mood and all.',       accent: '#67e8f9' },
  { path: '/todo',        icon: '🏋️', label: 'To‑Do',        desc: 'The pipeline of things still waiting on you.',              accent: '#a3e635' },
  { path: '/goals',       icon: '🎯', label: 'Goals',        desc: 'What you\'re building toward, and by when.',                accent: '#fbbf24' },
  { path: '/wishlist',    icon: '✨', label: 'Wish List',    desc: 'Pure wants. No justification required.',                    accent: '#fda4af' },
  { path: '/drama',       icon: '🎬', label: 'Drama List',   desc: 'Dramas, movies and anime that made you feel something.',    accent: '#c084fc' },
  { path: '/music',       icon: '🎧', label: 'Music',        desc: 'The songs stuck on repeat behind every session.',           accent: '#34d399' },
  { path: '/gallery',     icon: '🖼️', label: 'Gallery',      desc: 'A scrapbook of the moments worth keeping.',                 accent: '#f9a8d4' },
  { path: '/hobbies',     icon: '🌿', label: 'Hobbies',      desc: 'The things that keep you curious off‑screen.',              accent: '#52d68a' },
  { path: '/notes',       icon: '📝', label: 'Notes',        desc: 'Private thoughts that don\'t belong in a commit message.',  accent: '#93c5fd' },
  { path: '/gestureDraw', icon: '🎨', label: 'Gesture Draw', desc: 'A blank canvas, for when words aren\'t it.',                accent: '#f472b6' },
  { path: '/aboutme',     icon: '🥰', label: 'About Me',     desc: 'The identity record behind everything else here.',         accent: '#f97316' },
];

const PRINCIPLES = [
  { icon: '🗂️', title: 'Record what mattered', body: 'Not everything — just the parts of a day worth finding again later.' },
  { icon: '↩️',  title: 'Return anytime',        body: 'jibunai keeps the thread. You pick it back up wherever you left off.' },
  { icon: '🔒',  title: 'Yours, only',           body: 'No feed, no followers, no audience. This is a record, not a broadcast.' },
];

export default function LandingPage() {
  const word = useRotatingWord(WORDS);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <GlobalStyle />
      <PageWrap>

        <Nav $scrolled={scrolled}>
          <NavBrand>
            <NavDot />
            jibun<em>ai</em>
          </NavBrand>
          <NavRight>
            <NavLink href="#archive">Archive</NavLink>
            <NavLink href="#principles">Why</NavLink>
            <EnterBtn to="/myarea">Enter →</EnterBtn>
          </NavRight>
        </Nav>

        <Hero>
          <HeroBg />
          <Drifter $anim={drift1} style={{ left: '8%', top: '22%' }}>🎬</Drifter>
          <Drifter $anim={drift2} style={{ right: '10%', top: '16%' }}>🎯</Drifter>
          <Drifter $anim={drift3} style={{ left: '14%', bottom: '18%' }}>📝</Drifter>
          <Drifter $anim={drift1} style={{ right: '13%', bottom: '24%', animationDelay: '.8s' }}>✨</Drifter>
          <Drifter $anim={drift2} style={{ right: '30%', top: '8%', animationDelay: '1.3s' }}>🎧</Drifter>

          <HeroChip><span />Personal archive, not a social app</HeroChip>

          <HeroTitle>
            The private record<br />of <em>you</em>.
          </HeroTitle>

          <HeroRotator>
            Every <RotWord key={word}>{word}</RotWord>
          </HeroRotator>

          <HeroDesc>
            jibunai is where the small, undocumented parts of a life get kept —
            what you watched, wanted, finished, and felt. One running log,
            eleven quiet rooms, built for exactly one reader: you.
          </HeroDesc>

          <HeroActions>
            <PrimaryBtn to="/myarea">Open my archive</PrimaryBtn>
            <SecondaryBtn href="#archive">See what's inside ↓</SecondaryBtn>
          </HeroActions>

          <TickerWrap aria-hidden="true">
            <TickerTrack>
              {[...SECTIONS, ...SECTIONS].map((s, i) => (
                <TickerItem key={i}><span>{s.icon}</span>{s.label}</TickerItem>
              ))}
            </TickerTrack>
          </TickerWrap>
        </Hero>

        <Principles id="principles">
          <SecEyebrow>How this works</SecEyebrow>
          <SecTitle>Three rules, kept quietly</SecTitle>
          <PrincipleGrid>
            {PRINCIPLES.map((p, i) => (
              <PrincipleCard key={p.title} style={{ animationDelay: `${i * 0.08}s` }}>
                <PrincipleIcon>{p.icon}</PrincipleIcon>
                <PrincipleTitle>{p.title}</PrincipleTitle>
                <PrincipleBody>{p.body}</PrincipleBody>
              </PrincipleCard>
            ))}
          </PrincipleGrid>
        </Principles>

        <Archive id="archive">
          <SecEyebrow>The archive</SecEyebrow>
          <SecTitle>Eleven rooms. One version of you.</SecTitle>
          <SecDesc>
            Every section below is a living record — add to it in a minute,
            revisit it in a year. Click any room to walk in.
          </SecDesc>

          <BentoGrid>
            {SECTIONS.map((s, i) => (
              <BentoCard to={s.path} key={s.path} $accent={s.accent} style={{ animationDelay: `${i * 0.05}s` }}>
                <BentoIconBox $accent={s.accent}>{s.icon}</BentoIconBox>
                <BentoLabel>{s.label}</BentoLabel>
                <BentoDesc>{s.desc}</BentoDesc>
                <BentoArrow $accent={s.accent}>↗</BentoArrow>
              </BentoCard>
            ))}

          </BentoGrid>
        </Archive>

        <Footer>
          <FooterTop>
            <FooterBrand>
              jibun<em>ai</em>
              <FooterTag>the private record of you</FooterTag>
            </FooterBrand>
            <FooterNav>
              <a href="#archive">Archive</a>
              <a href="#principles">Why</a>
              <Link to="/myarea">Enter</Link>
            </FooterNav>
          </FooterTop>
          <FooterRule />
          <FooterBottom>
            <span>Kept for one reader only.</span>
            <LiveDot><i />writing today's entry…</LiveDot>
          </FooterBottom>
        </Footer>

      </PageWrap>
    </>
  );
}



const PageWrap = styled.div`
  min-height: 100vh;
  background: ${C.bg};
  position: relative;
  overflow-x: hidden;
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(24,24,27,.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(24,24,27,.035) 1px, transparent 1px);
    background-size: 56px 56px;
    pointer-events: none;
    z-index: 0;
  }
`;

const Nav = styled.header`
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${p => p.$scrolled ? '0.85rem 2.5rem' : '1.4rem 2.5rem'};
  background: ${p => p.$scrolled ? 'rgba(250,250,248,0.85)' : 'transparent'};
  backdrop-filter: ${p => p.$scrolled ? 'blur(14px)' : 'none'};
  border-bottom: 1px solid ${p => p.$scrolled ? C.border : 'transparent'};
  transition: all 0.3s ease;

  @media (max-width: 640px) { padding: ${p => p.$scrolled ? '0.75rem 1.25rem' : '1.1rem 1.25rem'}; }
`;
const NavBrand = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${C.dark};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  em { font-style: normal; color: ${C.green}; }
`;
const NavDot = styled.span`
  width: 9px; height: 9px;
  border-radius: 50%;
  background: ${C.green};
  display: inline-block;
  animation: ${pulse} 2.4s ease infinite;
`;
const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1.75rem;
  @media (max-width: 560px) { gap: 1rem; }
`;
const NavLink = styled.a`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${C.soft};
  transition: color 0.2s ease;
  &:hover { color: ${C.dark}; }
  @media (max-width: 560px) { display: none; }
`;
const EnterBtn = styled(Link)`
  font-family: 'Syne', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${C.white};
  background: ${C.dark};
  padding: 0.55rem 1.15rem;
  border-radius: 100px;
  transition: all 0.2s ease;
  &:hover { background: ${C.green}; transform: translateY(-1px); }
`;

const Hero = styled.section`
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8rem 2rem 4rem;
  overflow: hidden;
`;
const HeroBg = styled.div`
  position: absolute;
  inset: -10% -10% auto -10%;
  height: 130%;
  background:
    radial-gradient(circle at 22% 28%, rgba(16,185,129,0.09) 0%, transparent 45%),
    radial-gradient(circle at 78% 15%, rgba(212,175,55,0.07) 0%, transparent 40%),
    radial-gradient(circle at 50% 85%, rgba(16,185,129,0.06) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
`;
const Drifter = styled.span`
  position: absolute;
  font-size: 1.9rem;
  opacity: 0.55;
  filter: grayscale(0.1);
  animation: ${p => p.$anim} 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  @media (max-width: 720px) { display: none; }
`;
const HeroChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: 'Syne', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2.2px;
  color: ${C.soft};
  border: 1.5px solid ${C.border};
  background: ${C.white};
  padding: 0.4rem 0.95rem;
  border-radius: 100px;
  margin-bottom: 1.75rem;
  animation: ${fadeUp} 0.6s ease both;
  span {
    width: 6px; height: 6px; border-radius: 50%;
    background: ${C.green}; display: inline-block;
    animation: ${pulse} 2s ease infinite;
  }
`;
const HeroTitle = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(2.6rem, 7.5vw, 5.4rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.03;
  color: ${C.dark};
  margin-bottom: 1.1rem;
  animation: ${fadeUp} 0.6s ease 0.08s both;
  em {
    font-style: normal;
    color: ${C.green};
    position: relative;
    &::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: 8px;
      height: 12px;
      background: ${C.green};
      opacity: 0.12;
      z-index: -1;
    }
  }
`;
const HeroRotator = styled.div`
  font-family: 'DM Mono', monospace;
  font-size: clamp(1rem, 2.4vw, 1.3rem);
  color: ${C.soft};
  margin-bottom: 1.5rem;
  animation: ${fadeUp} 0.6s ease 0.14s both;
`;
const RotWord = styled.span`
  color: ${C.dark};
  font-weight: 500;
  border-bottom: 2px solid ${C.green};
  animation: ${fadeUp} 0.35s ease both;
`;
const HeroDesc = styled.p`
  font-size: 1.02rem;
  color: ${C.soft};
  max-width: 560px;
  line-height: 1.85;
  margin-bottom: 2.5rem;
  animation: ${fadeUp} 0.6s ease 0.2s both;
`;
const HeroActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 4.5rem;
  animation: ${fadeUp} 0.6s ease 0.26s both;
`;
const PrimaryBtn = styled(Link)`
  font-family: 'Syne', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${C.white};
  background: ${C.dark};
  padding: 0.95rem 1.9rem;
  border-radius: 100px;
  box-shadow: 0 8px 26px rgba(24,24,27,0.16);
  transition: all 0.22s ease;
  &:hover { background: ${C.green}; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(16,185,129,0.28); }
`;
const SecondaryBtn = styled.a`
  font-family: 'Syne', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${C.dark};
  background: transparent;
  border: 1.5px solid ${C.border};
  padding: 0.93rem 1.75rem;
  border-radius: 100px;
  transition: all 0.22s ease;
  &:hover { border-color: ${C.dark}; transform: translateY(-2px); }
`;

const TickerWrap = styled.div`
  width: min(100%, 780px);
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
  animation: ${fadeUp} 0.6s ease 0.32s both;
`;
const TickerTrack = styled.div`
  display: flex;
  width: max-content;
  gap: 2.25rem;
  animation: ${marquee} 26s linear infinite;
`;
const TickerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Syne', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: ${C.soft};
  white-space: nowrap;
  span { font-size: 0.95rem; }
`;

const SecEyebrow = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: ${C.green};
  text-align: center;
  margin-bottom: 0.85rem;
`;
const SecTitle = styled.h2`
  font-family: 'Syne', sans-serif;
  font-size: clamp(1.7rem, 3.6vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${C.dark};
  text-align: center;
  margin-bottom: 0.9rem;
`;
const SecDesc = styled.p`
  font-size: 0.98rem;
  color: ${C.soft};
  text-align: center;
  max-width: 560px;
  margin: 0 auto 3.25rem;
  line-height: 1.8;
`;

const Principles = styled.section`
  position: relative;
  z-index: 1;
  padding: 6rem 2rem 5rem;
  max-width: 1080px;
  margin: 0 auto;
`;
const PrincipleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;
  @media (max-width: 780px) { grid-template-columns: 1fr; }
`;
const PrincipleCard = styled.div`
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 18px;
  padding: 2rem 1.75rem;
  text-align: left;
  animation: ${fadeUp} 0.5s ease both;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  &:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(24,24,27,0.07); border-color: ${C.green}; }
`;
const PrincipleIcon = styled.div`font-size: 1.8rem; margin-bottom: 1rem;`;
const PrincipleTitle = styled.h3`
  font-family: 'Syne', sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  color: ${C.dark};
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
`;
const PrincipleBody = styled.p`font-size: 0.88rem; color: ${C.soft}; line-height: 1.7;`;

const Archive = styled.section`
  position: relative;
  z-index: 1;
  padding: 3rem 2rem 7rem;
  max-width: 1200px;
  margin: 0 auto;
`;
const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.15rem;
`;
const BentoCard = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 18px;
  padding: 1.6rem 1.5rem;
  min-height: 190px;
  animation: ${fadeUp} 0.5s ease both;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: ${p => p.$accent};
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 18px 40px rgba(24,24,27,0.09);
    border-color: ${p => p.$accent};
  }
  &:hover::before { transform: scaleX(1); }
`;
const BentoIconBox = styled.div`
  width: 44px; height: 44px;
  border-radius: 12px;
  background: ${p => p.$accent}22;
  border: 1.5px solid ${p => p.$accent}55;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
  margin-bottom: 1.1rem;
`;
const BentoLabel = styled.h3`
  font-family: 'Syne', sans-serif;
  font-size: 1.08rem;
  font-weight: 800;
  color: ${C.dark};
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
`;
const BentoDesc = styled.p`
  font-size: 0.84rem;
  color: ${C.soft};
  line-height: 1.65;
  flex: 1;
`;
const BentoArrow = styled.span`
  align-self: flex-end;
  font-size: 1rem;
  color: ${p => p.$accent};
  opacity: 0;
  transform: translate(-4px, 4px);
  transition: all 0.22s ease;
  ${BentoCard}:hover & { opacity: 1; transform: translate(0,0); }
`;
const CTACard = styled(Link)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: ${C.dark};
  border-radius: 18px;
  padding: 1.6rem 1.5rem;
  min-height: 190px;
  animation: ${fadeUp} 0.5s ease both;
  transition: transform 0.24s ease, box-shadow 0.24s ease;
  &:hover { transform: translateY(-5px); box-shadow: 0 18px 40px rgba(24,24,27,0.28); }
`;
const CTAIcon = styled.div`font-size: 1.5rem; margin-bottom: 0.9rem;`;
const CTALabel = styled.h3`
  font-family: 'Syne', sans-serif;
  font-size: 1.08rem;
  font-weight: 800;
  color: ${C.white};
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
`;
const CTADesc = styled.p`font-size: 0.84rem; color: rgba(255,255,255,0.6); line-height: 1.65;`;

const Footer = styled.footer`
  position: relative;
  z-index: 1;
  border-top: 1.5px solid ${C.border};
  padding: 3rem 2.5rem 2.25rem;
  max-width: 1200px;
  margin: 0 auto;
`;
const FooterTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
`;
const FooterBrand = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: ${C.dark};
  em { font-style: normal; color: ${C.green}; }
`;
const FooterTag = styled.div`
  font-size: 0.78rem;
  color: ${C.soft};
  font-weight: 400;
  margin-top: 0.35rem;
  font-family: 'DM Sans', sans-serif;
`;
const FooterNav = styled.div`
  display: flex;
  gap: 1.75rem;
  font-size: 0.85rem;
  color: ${C.soft};
  a:hover { color: ${C.dark}; }
`;
const FooterRule = styled.div`
  height: 1px;
  background: ${C.border};
  margin: 2.25rem 0 1.25rem;
`;
const FooterBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: ${C.soft};
`;
const LiveDot = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: 'DM Mono', monospace;
  i {
    width: 6px; height: 6px; border-radius: 50%;
    background: ${C.green}; display: inline-block;
    animation: ${blink} 1.4s ease infinite;
  }
`;