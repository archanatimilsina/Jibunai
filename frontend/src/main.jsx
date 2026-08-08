import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

import LandingPage from "./LandingPage.jsx";
import Drama from '../src/components/Dramalist.jsx';
import MemoryCard from '../src/components/Gallery.jsx';
import GestureDraw from '../src/components/GestureDraw.jsx';
import Goals from '../src/components/Goals.jsx';
import Hobbies from '../src/components/Hobbies.jsx';
import MusicVibes from '../src/components/music.jsx';
import MyArea from '../src/components/MyArea.jsx';
import Notes from '../src/components/Notes.jsx';
import MyDayLogPage from '../src/components/Tellme.jsx';
import ChronosTaskFlow from '../src/components/TodoArea.jsx';
import Wishlist from '../src/components/WishList.jsx'



createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/">
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<LandingPage />} />  
        <Route path='drama' element={<Drama />} />   
        <Route path='gallery' element={<MemoryCard />} />   
        <Route path='gestureDraw' element={<GestureDraw />} />   
        <Route path='goals' element={<Goals />} />   
        <Route path='hobbies' element={<Hobbies />} />   
        <Route path='music' element={<MusicVibes />} />   
        <Route path='myarea' element={<MyArea />} />   
        <Route path='notes' element={<Notes />} />   
        <Route path='tellme' element={<MyDayLogPage />} />   
        <Route path='todo' element={<ChronosTaskFlow />} />   
        <Route path='wishlist' element={<Wishlist />} />   
      </Route>
    </Routes>
  </BrowserRouter>
);


