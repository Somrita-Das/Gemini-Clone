import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import './WelcomePopup.css';

gsap.registerPlugin(useGSAP);

const WelcomePopup = () => {
  const container = useRef();

  useGSAP(() => {
    gsap.from(container.current, {
      duration: 1,
      scale: 0.5,
      opacity: 0,
      ease: 'power3.out',
    });
  }, { scope: container });

  return (
    <div className="welcome-popup-container" ref={container}>
      <div className="welcome-popup-card">
        <h1>Welcome to Somrita AI</h1>
      </div>
    </div>
  );
};

export default WelcomePopup;
