import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Skill = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <PageWrapper>
      <SkillCard>
        <h1>Skill Page</h1>
        <p>Welcome to the dedicated skills section of the application.</p>
        <GoBackBtn onClick={handleGoBack}>
          Go Back
        </GoBackBtn>
      </SkillCard>
    </PageWrapper>
  );
};

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f4f4f9;
`;

const SkillCard = styled.section`
  background-color: #ffffff;
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  text-align: center;
  max-width: 400px;
  width: 90%;

  h1 {
    font-family: 'Segoe UI', sans-serif;
    color: #2d3436;
    margin-bottom: 1rem;
  }

  p {
    color: #636e72;
    line-height: 1.6;
    margin-bottom: 2rem;
  }
`;

const GoBackBtn = styled.button`
  background-color: #0984e3;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #74b9ff;
    transform: translateY(-2px);
  }
`;

export default Skill;