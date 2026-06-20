import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Project from "./components/Project.jsx";
import Skill from "./components/Skill.jsx";
import Experience from "./components/Experience.jsx";
import Contact from "./components/Contact.jsx";
import LandingPage from "./components/LandingPage.jsx";
import About from './components/About.jsx';
import GestureNavigator from './components/GestureNavigator.jsx';


createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/">
    <GestureNavigator />
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<LandingPage />} />  
        <Route path='experience' element={<Experience />} />  
       <Route path='projects' element={<Project />} />  
        <Route path='contact' element={<Contact />} />  
        <Route path='about' element={<About />} />  
        <Route path='skills' element={<Skill />} />   
      </Route>
    </Routes>
  </BrowserRouter>
);


