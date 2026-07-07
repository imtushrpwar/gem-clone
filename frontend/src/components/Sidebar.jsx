import  { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContextInstance';
import { MessageSquare, MessageCirclePlus, LogOut, Trash2 } from 'lucide-react';

export default function Sidebar({ currentSessionId, setSessionId, setMessages }) {
  const { token, user, logout } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);

  // Clear everything in local component states on logout
  const executeCleanLogout = () => {
    setSessions([]);      // Wipe sidebar conversation history rows
    setSessionId(null);   // Drop active conversation focus pointer
    setMessages([]);      // Clear text message bubbles from workspace
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
        ,credentials: 'include' // Ensure cookies are sent with the request for authentication
      });
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchSessions();
  }, [token, currentSessionId]);

  const loadSession = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/chat/session/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include' // Ensure cookies are sent with the request for authentication
      });
      if (!res.ok) throw new Error("Failed to fetch session history");
      const data = await res.json();
      setSessionId(id);
      setMessages(data.messages || []); 
    } catch (err) {
      console.error(err);
      setMessages([]); 
    }
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/chat/session/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Ensure cookies are sent with the request for authentication
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setSessions(prev => prev.filter(s => s._id !== id));
        if (currentSessionId === id) {
          setSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={() => { setSessionId(null); setMessages([]); }}>
        <MessageCirclePlus size={18} /> New Chat
      </button>
      
      <div className="sessions-list">
        {sessions && sessions.map(s => (
          <div 
            key={s._id} 
            className={`session-item ${currentSessionId === s._id ? 'active' : ''}`}
            onClick={() => loadSession(s._id)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <MessageSquare size={16} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
            </div>
            <button 
              className="delete-session-icon-btn" 
              onClick={(e) => deleteSession(e, s._id)}
              style={{ background: 'none', border: 'none', color: '#80868b', cursor: 'pointer', padding: '4px' }}
            >
              <Trash2 size={14} className="trash-icon" />
            </button>
          </div>
        ))}
      </div>

      {/* 👈 FIXED & INTEGRATED: Dynamic User Footer Module */}
      <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #28292a' }}>
        {user && (
          <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', padding: '0 5px' }}>
            <div className="avatar" style={{ background: '#5c6bc0', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', color: '#e3e3e3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </span>
          </div>
        )}
        <button className="logout-btn" onClick={() => {logout(executeCleanLogout)}} style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  );
}