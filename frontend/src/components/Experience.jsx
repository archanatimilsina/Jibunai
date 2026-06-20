import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Experience = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <PageWrapper>
      <ExperienceCard>
        <h1>Experience</h1>
        <p>This is your professional history and project background page.</p>
        <GoBackBtn onClick={handleGoBack}>
          Go Back
        </GoBackBtn>
      </ExperienceCard>
    </PageWrapper>
  );
};

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const ExperienceCard = styled.section`
  background-color: #ffffff;
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
  max-width: 450px;
  width: 90%;
  border-top: 8px solid #6c5ce7; /* Subtle accent color to differentiate */

  h1 {
    font-family: sans-serif;
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
  background-color: #6c5ce7; 
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #5b4bc4;
    transform: translateY(-2px);
  }
`;

export default Experience;