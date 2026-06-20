import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const AboutPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <AboutContainer>
      <div className='TextContainer'>About Me</div>
      <GoBackBtn onClick={handleGoBack}>
        Go Back
      </GoBackBtn>
    </AboutContainer>
  );
};

const AboutContainer = styled.section`
  background-color: #fdf6e3; 
  color: #586e75;
  margin: 200px auto;
  width: 500px;
  height: 300px;
  border-radius: 50px 0px 50px 0px;
  border: 10px solid white;
  display: flex;
  flex-direction: column;
  align-items: center;

  .TextContainer {
    margin-top: 80px;
    font-size: 1.5rem;
    font-family: 'Baloo', sans-serif;
    font-weight: 600;
  }
`;

const GoBackBtn = styled.button`
  background-color: #b58900; /* Warm gold/amber tone */
  color: white;
  border: none;
  border-radius: 8px;
  outline: none;
  width: 100px;
  height: 35px;
  margin-top: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #856404;
    color: #ffffff;
    transform: translateY(-5px);
  }
`;

export default AboutPage;