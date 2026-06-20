import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const ContactPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <ContactContainer>
      <div className='TextContainer'>Get in touch with me</div>
      <GoBackBtn onClick={handleGoBack}>
        Go Back
      </GoBackBtn>
    </ContactContainer>
  );
};

const ContactContainer = styled.section`
  background-color: #e2e8f0;
  color: #1e293b;
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
  background-color: #334155; 
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
    background-color: #0f172a;
    color: #f8fafc;
    transform: translateY(-5px);
  }
`;

export default ContactPage;