import React, { useState } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

const API_BASE = import.meta.env.VITE_API_URL;
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const floatAnim = keyframes`
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
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
`;


const PageWrapper = styled.div`
  min-height: 100vh;
  background: #f6f5f0;
`;

const TopBar = styled.nav`
  background: #f6f5f0;
  border-bottom: 1.5px solid #d8d4cc;
  padding: 1.1rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 50;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  font-family: 'Syne', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #7a7567;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    color: #2d6a4f;
    transform: translateX(-4px);
  }
`;

const VerifiedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Syne', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #7a7567;

  span {
    width: 8px;
    height: 8px;
    background: #2d6a4f;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(45, 106, 79, 0.5);
  }
`;

const Container = styled.main`
  max-width: 1100px;
  margin: 0 auto;
  padding: 3.5rem 2.5rem 6rem;
  animation: ${fadeUp} 0.45s ease forwards;
`;

const Hero = styled.div`
  margin-bottom: 3rem;
  padding-bottom: 2.5rem;
  border-bottom: 1.5px solid #d8d4cc;
`;

const CredTypeChip = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #2d6a4f;
  background: #d8f3dc;
  padding: 0.35rem 0.85rem;
  border-radius: 100px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 0.5rem;
`;

const Title = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  color: #1a1a2e;
  letter-spacing: -0.03em;
  line-height: 1.1;
`;

const OrgLine = styled.p`
  font-size: 1.05rem;
  color: #7a7567;
  margin-top: 0.4rem;

  strong {
    color: #1a1a2e;
    font-weight: 600;
  }
`;

const DurationTag = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #7a7567;
  background: #eceae3;
  padding: 0.3rem 0.75rem;
  border-radius: 100px;
  display: inline-block;
  margin-top: 0.75rem;
`;


const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;

  @media (min-width: 860px) {
    grid-template-columns: 1fr 380px;
    align-items: start;
  }
`;

const LeftCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.75rem;
`;

const RightCol = styled.div`
  position: sticky;
  top: 5.5rem;
`;


const Sec = styled.section``;

const SecLabel = styled.h2`
  font-family: 'Syne', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #7a7567;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #d8d4cc;
  }
`;

const Block = styled.div`
  background: #ffffff;
  border: 1.5px solid #d8d4cc;
  border-radius: 16px;
  padding: 2rem 2.25rem;
  font-size: 1.05rem;
  color: #334155;
  line-height: 1.7;
`;

const LearningList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    align-items: flex-start;
    gap: 0.9rem;
    font-size: 1.05rem;
    color: #334155;
    line-height: 1.55;

    &::before {
      content: '⚡';
      font-size: 0.9rem;
      flex-shrink: 0;
      margin-top: 0.15rem;
    }
  }
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const Pill = styled.span`
  font-size: 0.88rem;
  font-weight: 500;
  color: #1a1a2e;
  background: #d8f3dc;
  border: 1.5px solid #b7e4c7;
  padding: 0.4rem 1rem;
  border-radius: 100px;
`;


const CertCard = styled.div`
  background: #ffffff;
  border: 1.5px solid #d8d4cc;
  border-radius: 20px;
  padding: 1.25rem;
  box-shadow: 0 8px 32px rgba(26, 26, 46, 0.07);
  cursor: zoom-in;
  animation: ${floatAnim} 6s ease-in-out infinite;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(26, 26, 46, 0.12);
  }
`;

const CertImgWrap = styled.div`
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #eceae3;
  border: 1.5px solid #d8d4cc;
`;

const CertImg = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const CertCaption = styled.p`
  text-align: center;
  font-family: 'Syne', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #7a7567;
  margin-top: 0.85rem;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 46, 0.88);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: zoom-out;
  padding: 2rem;
`;

const ModalBox = styled.div`
  background: #ffffff;
  border: 1.5px solid #d8d4cc;
  border-radius: 16px;
  padding: 0.75rem;
  max-width: 90vw;
  max-height: 88vh;
  overflow: hidden;

  img {
    max-width: 100%;
    max-height: 82vh;
    display: block;
    object-fit: contain;
    border-radius: 10px;
  }
`;


export default function ProfessionalCredential({ credentialData, onBack }) {
  const [modalOpen, setModalOpen] = useState(false);
  const data = credentialData || {};

  return (
    <PageWrapper>
      <GlobalStyle />

      <TopBar>
        <BackBtn onClick={onBack}>← Back to Portfolio</BackBtn>
        <VerifiedBadge><span /> Verified Credential</VerifiedBadge>
      </TopBar>

      <Container>
        <Hero>
          <CredTypeChip>
            {data.name || 'Credential'}
          </CredTypeChip>
          <TitleRow>
            <Title>{data.subject || 'Subject'}</Title>
          </TitleRow>
          <OrgLine>
            <strong>{data.company}</strong> — {data.name}
          </OrgLine>
          {data.duration && <DurationTag>⏱ {data.duration}</DurationTag>}
        </Hero>

        <TwoCol>
          <LeftCol>

            {data.description && (
              <Sec>
                <SecLabel>Experience Narrative</SecLabel>
                <Block>{data.description}</Block>
              </Sec>
            )}

            {data.learnings?.length > 0 && (
              <Sec>
                <SecLabel>What I Learned</SecLabel>
                <Block>
                  <LearningList>
                    {data.learnings.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </LearningList>
                </Block>
              </Sec>
            )}

            {data.skillsAcquired?.length > 0 && (
              <Sec>
                <SecLabel>Skills Acquired</SecLabel>
                <PillRow>
                  {data.skillsAcquired.map((s, i) => <Pill key={i}>{s}</Pill>)}
                </PillRow>
              </Sec>
            )}

          </LeftCol>

          <RightCol>
            <SecLabel>Verification Document</SecLabel>
            <CertCard onClick={() => setModalOpen(true)}>
              <CertImgWrap>
                <CertImg
                  src={data.certificateImage || 'https://via.placeholder.com/800x560.png?text=Certificate'}
                  alt={`${data.subject} Certificate`}
                />
              </CertImgWrap>
              <CertCaption>🔍 Click to enlarge</CertCaption>
            </CertCard>
          </RightCol>
        </TwoCol>
      </Container>

      {modalOpen && (
        <Overlay onClick={() => setModalOpen(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <img
              src={data.certificateImage || 'https://via.placeholder.com/800x560.png?text=Certificate'}
              alt="Certificate Full View"
            />
          </ModalBox>
        </Overlay>
      )}
    </PageWrapper>
  );
}