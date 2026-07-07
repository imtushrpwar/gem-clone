import  { useState, useContext } from 'react';
import { AuthContext } from '../src/context/AuthContextInstance';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Login from './components/Login';

export default function App() {
  const { token } = useContext(AuthContext);
  const [currentSessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);

  if (!token) return <Login />;

  return (
    <div className="app-layout">
      <Sidebar 
        currentSessionId={currentSessionId} 
        setSessionId={setSessionId} 
        setMessages={setMessages} 
      />
      <ChatArea 
        currentSessionId={currentSessionId} 
        setSessionId={setSessionId} 
        messages={messages} 
        setMessages={setMessages} 
      />
    </div>
  );
}