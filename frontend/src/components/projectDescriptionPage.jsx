import React from 'react';
import PropTypes from 'prop-types';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
const API_BASE = import.meta.env.VITE_API_URL;
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
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

const LiveDot = styled.div`
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
  max-width: 900px;
  margin: 0 auto;
  padding: 3.5rem 2.5rem 6rem;
  animation: ${fadeUp} 0.45s ease forwards;
`;


const Hero = styled.div`
  margin-bottom: 3.5rem;
  padding-bottom: 2.5rem;
  border-bottom: 1.5px solid #d8d4cc;
`;

const TechChip = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #2d6a4f;
  background: #d8f3dc;
  padding: 0.35rem 0.85rem;
  border-radius: 100px;
  display: inline-block;
  margin-bottom: 1.25rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 0.75rem;
`;

const EmojiBox = styled.span`
  font-size: 3rem;
  line-height: 1;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1.5px solid #d8d4cc;
  border-radius: 16px;
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 800;
  color: #1a1a2e;
  line-height: 1.1;
  letter-spacing: -0.03em;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #7a7567;
  line-height: 1.55;
  max-width: 680px;
  margin-top: 0.5rem;
`;


const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3rem;
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

const StackGroup = styled.div`
  & + & {
    margin-top: 1.75rem;
    padding-top: 1.75rem;
    border-top: 1px solid #eceae3;
  }
`;

const StackGroupLabel = styled.h3`
  font-family: 'Syne', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #7a7567;
  margin-bottom: 0.85rem;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const TechTag = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: #1a1a2e;
  background: ${p => p.$primary ? '#d8f3dc' : '#f6f5f0'};
  border: 1.5px solid ${p => p.$primary ? '#b7e4c7' : '#d8d4cc'};
  padding: 0.45rem 1rem;
  border-radius: 100px;
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const HighlightList = styled.ul`
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
      content: '✓';
      color: #2d6a4f;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }
  }
`;


const BtnRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const GhBtn = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.75rem;
  background: #1a1a2e;
  color: #f6f5f0;
  text-decoration: none;
  font-family: 'Syne', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 100px;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;

  &:hover {
    background: #2d6a4f;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(45, 106, 79, 0.2);
  }
`;

const SecBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 0.85rem 1.75rem;
  background: transparent;
  color: #7a7567;
  border: 1.5px solid #d8d4cc;
  font-family: 'Syne', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #1a1a2e;
    color: #1a1a2e;
    transform: translateY(-2px);
  }
`;


export default function ProjectSpecificationPage({ projectData, onBack }) {
  const data = projectData || {};
  const stack = data.techStack || {};

  return (
    <PageWrapper>
      <GlobalStyle />

      <TopBar>
        <BackBtn onClick={onBack}>← Back to Portfolio</BackBtn>
        <LiveDot><span /> Live Project View</LiveDot>
      </TopBar>

      <Container>
        <Hero>
          <TechChip>{data.tech || 'Full Stack Architecture'}</TechChip>
          <TitleRow>
            {data.emoji && <EmojiBox>{data.emoji}</EmojiBox>}
            <Title>{data.name}</Title>
          </TitleRow>
          <Subtitle>{data.note}</Subtitle>
        </Hero>

        <Sections>

          <Sec>
            <SecLabel>System Overview</SecLabel>
            <Block>{data.description || 'No description provided.'}</Block>
          </Sec>

          {(stack.languages?.length || stack.frameworks?.length || stack.tools?.length) && (
            <Sec>
              <SecLabel>Architecture & Technologies</SecLabel>
              <Block>
                {stack.languages?.length > 0 && (
                  <StackGroup>
                    <StackGroupLabel>Programming Languages</StackGroupLabel>
                    <TagRow>
                      {stack.languages.map((l, i) => <TechTag key={i} $primary>{l}</TechTag>)}
                    </TagRow>
                  </StackGroup>
                )}
                {stack.frameworks?.length > 0 && (
                  <StackGroup>
                    <StackGroupLabel>Frameworks & Libraries</StackGroupLabel>
                    <TagRow>
                      {stack.frameworks.map((f, i) => <TechTag key={i}>{f}</TechTag>)}
                    </TagRow>
                  </StackGroup>
                )}
                {stack.tools?.length > 0 && (
                  <StackGroup>
                    <StackGroupLabel>Infrastructure, Databases & Tooling</StackGroupLabel>
                    <TagRow>
                      {stack.tools.map((t, i) => <TechTag key={i}>{t}</TechTag>)}
                    </TagRow>
                  </StackGroup>
                )}
              </Block>
            </Sec>
          )}

          {data.architecturalHighlights?.length > 0 && (
            <Sec>
              <SecLabel>Technical Implementation Highlights</SecLabel>
              <Block>
                <HighlightList>
                  {data.architecturalHighlights.map((h, i) => <li key={i}>{h}</li>)}
                </HighlightList>
              </Block>
            </Sec>
          )}

          <BtnRow>
            {data.github && (
              <GhBtn href={data.github} target="_blank" rel="noopener noreferrer">
                Explore Source Code on GitHub 🚀
              </GhBtn>
            )}
            <SecBtn onClick={onBack}>Return to Project Board</SecBtn>
          </BtnRow>

        </Sections>
      </Container>
    </PageWrapper>
  );
}

ProjectSpecificationPage.propTypes = {
  projectData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    note: PropTypes.string,
    github: PropTypes.string,
    tech: PropTypes.string,
    emoji: PropTypes.string,
    description: PropTypes.string,
    techStack: PropTypes.shape({
      languages: PropTypes.arrayOf(PropTypes.string),
      frameworks: PropTypes.arrayOf(PropTypes.string),
      tools: PropTypes.arrayOf(PropTypes.string),
    }),
    architecturalHighlights: PropTypes.arrayOf(PropTypes.string),
  }),
  onBack: PropTypes.func.isRequired,
};