import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import barba from '@barba/core';
import './SomritaAI.css';

gsap.registerPlugin(useGSAP);

// Custom hook for the typing animation
const useTypingEffect = (text, speed = 50) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) return;
    setDisplayedText('');
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i > text.length - 1) {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return displayedText;
};

const AIMessage = ({ text, onSpeak, isSpeaking, id }) => {
  const typedText = useTypingEffect(text, 20);
  return (
    <div className="ai-message-content">
      <ReactMarkdown>{typedText}</ReactMarkdown>
      <button onClick={() => onSpeak(text, id)} className={`icon-button speaker-button ${isSpeaking ? 'speaking' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      </button>
    </div>
  );
};

const fileToGenerativePart = async (file) => {
  const base64EncodedData = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const SomritaAI = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hi! I’m Somrita AI 🤖. How can I help you today?', isUser: false },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const container = useRef();

  // GSAP Animations
  useGSAP(() => {
    gsap.from('.chatbot-card', { duration: 1, y: 100, opacity: 0, ease: 'power3.out' });
    gsap.from('.chat-input', { duration: 1, y: 50, opacity: 0, delay: 0.5, ease: 'power3.out' });
  }, { scope: container });

  // Animate new messages
  useEffect(() => {
    if (chatHistoryRef.current && chatHistoryRef.current.lastChild) {
      gsap.from(chatHistoryRef.current.lastChild, { duration: 0.5, y: 30, opacity: 0, ease: 'power3.out' });
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  // Barba.js initialization
  useEffect(() => {
    // Prevent re-initialization
    if (!document.body.hasAttribute('data-barba-initialized')) {
        document.body.setAttribute('data-barba-initialized', 'true');
        barba.init({
          transitions: [{
            name: 'opacity-transition',
            leave(data) {
              return gsap.to(data.current.container, { opacity: 0, duration: 0.25 });
            },
            enter(data) {
              return gsap.from(data.next.container, { opacity: 0, duration: 0.25 });
            }
          }]
        });
    }
  }, []);

  useEffect(() => {
    // Initial greeting
    const initialMessage = {
      id: Date.now(),
      text: 'Hi! I’m Somrita AI 🤖. How can I help you today?',
      isUser: false,
      isTyping: false,
    };
    setMessages([initialMessage]);
  }, []);

  const sendMessage = async () => {
    if (input.trim() === '' && !selectedFile) return;

    const currentInput = input;
    const currentFile = selectedFile;
    const currentFilePreview = filePreview;

    const userMessage = { id: Date.now(), text: currentInput, isUser: true, file: currentFilePreview };
    setMessages((prev) => [...prev, userMessage]);

    setInput('');
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    setIsTyping(true);

    // Placeholder for AI response
    const aiTypingId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: aiTypingId, text: '', isUser: false, isTyping: true }]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const model = 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const prompt = `Format your response in Markdown. User request: ${input}`;

      const parts = [
        { text: input },
      ];

      if (selectedFile) {
        const imagePart = await fileToGenerativePart(selectedFile);
        parts.push(imagePart);
      }

      const requestParts = [{ text: currentInput }];
      if (currentFile) {
        const imagePart = await fileToGenerativePart(currentFile);
        requestParts.push(imagePart);
      }

      const response = await axios.post(url, { contents: [{ parts: requestParts }] });
      const aiText = response.data.candidates[0].content.parts[0].text;

      // Replace placeholder with the actual message
      setMessages((prev) => prev.map(msg => 
        msg.id === aiTypingId ? { ...msg, text: aiText, isTyping: false } : msg
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      const errorText = 'Sorry, an error occurred. Please try again.';
      setMessages((prev) => prev.map(msg => 
        msg.id === aiTypingId ? { ...msg, text: errorText, isTyping: false } : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isTyping) sendMessage();
  };

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    fileInputRef.current.value = null; // Reset file input
  };

  const handleSpeak = (text, id) => {
    if (speechSynthesis.speaking && currentlySpeakingId === id) {
      speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      setIsSpeaking(false);
      return;
    }

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentlySpeakingId(id);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };
    speechSynthesis.speak(utterance);
  };

  // --- Voice Assistant --- //
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Web Speech API is not supported by this browser.');
      return;
    }

    recognitionRef.current = new window.webkitSpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

  }, []);

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="chatbot-card" ref={container}>
        <div className="chat-header">
          <h1>Somrita AI</h1>
        </div>
        <div className="chat-history" ref={chatHistoryRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.isUser ? 'user' : 'ai'}`}>
              {msg.isUser ? 
                <>
                  {msg.file && <img src={msg.file} alt="Sent file" className="message-image"/>}
                  {msg.text}
                </> : 
                msg.isTyping ? <div className="typing-indicator"><span></span><span></span><span></span></div> : <AIMessage text={msg.text} onSpeak={handleSpeak} isSpeaking={currentlySpeakingId === msg.id} id={msg.id} />
              }
            </div>
          ))}
        </div>
        {filePreview && (
          <div className="file-preview">
            <img src={filePreview} alt="Preview" />
            <button onClick={handleRemoveFile}>&times;</button>
          </div>
        )}
        <div className="chat-input">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
          <button onClick={handleFileSelect} className="icon-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Somrita AI..."
            disabled={isTyping}
          />
          <button onClick={handleVoiceInput} className={`icon-button ${isListening ? 'listening' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
          </button>
          <button onClick={sendMessage} disabled={isTyping} className="icon-button send-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
    </div>
  );
};

export default SomritaAI;