import React, { useState, useEffect } from 'react';
import SomritaAI from './SomritaAI';
import WelcomePopup from './WelcomePopup';
import Background from './Background';
import { gsap } from 'gsap';
import './App.css';

function App() {
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    const welcomeTl = gsap.timeline();
    welcomeTl
      .fromTo('.welcome-popup-container', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' })
      .to('.welcome-popup-container', { 
        opacity: 0, 
        scale: 0.8, 
        duration: 1, 
        ease: 'power3.in', 
        delay: 1.5, 
        onComplete: () => setShowChatbot(true) 
      });
  }, []);

  return (
    <div className="App" data-barba="wrapper">
      <Background />
      <div data-barba="container" data-barba-namespace="home">
        {showChatbot ? <SomritaAI /> : <WelcomePopup />}
      </div>
    </div>
  );
}

export default App;
