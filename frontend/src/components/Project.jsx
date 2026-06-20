import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const ProjectPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <PageWrapper>
      <ProjectCard>
        <div className="TextContainer">Hello! Welcome to the project page</div>
        <GoBackBtn onClick={handleGoBack}>
          Go Back
        </GoBackBtn>
      </ProjectCard>
    </PageWrapper>
  );
};

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f4f8;
`;

const ProjectCard = styled.section`
  background-color: #e8f5e9; 
  color: #1b5e20; 
  padding: 3rem;
  border-radius: 50px 0px 50px 0px;
  border: 10px solid white;
  width: 500px;
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);

  .TextContainer {
    margin-top: 50px;
    font-size: 1.5rem;
    font-family: 'Baloo', sans-serif;
  }
`;

const GoBackBtn = styled.button`
  background-color: #2e7d32;
  color: white;
  border: none;
  border-radius: 8px;
  outline: none;
  width: 120px;
  height: 40px;
  margin-top: 30px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #1b5e20;
    color: #ffffff;
    transform: translateY(-5px);
  }
`;

export default ProjectPage;