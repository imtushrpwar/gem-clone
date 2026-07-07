import { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContextInstance';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Copy, Check, Image, X } from 'lucide-react';

export default function ChatArea({ currentSessionId, setSessionId, messages, setMessages }) {
  const { token, user } = useContext(AuthContext);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
    }
  }, [user, setMessages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userPrompt = input;
    setInput('');
    setLoading(true);

    const imageToSend = selectedImage;
    const instantImagePreview = imagePreviewUrl; 
    removeSelectedImage();

    const initialHistory = [
      ...messages, 
      { role: 'user', text: userPrompt, imageUrl: instantImagePreview }
    ];
    setMessages([...initialHistory, { role: 'model', text: '' }]);

    try {
      const formData = new FormData();
      formData.append('messageText', userPrompt);
      if (currentSessionId) {
        formData.append('sessionId', currentSessionId);
      }
      if (imageToSend) {
        formData.append('image', imageToSend);
      }

      const response = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          const rawChunks = decoder.decode(value).split('\n');
          for (const line of rawChunks) {
            if (line.startsWith('data: ')) {
              const cleanedStr = line.replace('data: ', '').trim();
              if (cleanedStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(cleanedStr);

                if (!currentSessionId && parsed.sessionId !== "error") {
                  setSessionId(parsed.sessionId);
                }

                setMessages(prev => {
                  const updated = [...prev];
                  
                  if (updated[updated.length - 2] && !updated[updated.length - 2].imageUrl) {
                    updated[updated.length - 2].imageUrl = instantImagePreview;
                  }

                  if (parsed.isError) {
                    updated[updated.length - 1].text = parsed.text;
                    updated[updated.length - 1].isError = true;
                  } else {
                    updated[updated.length - 1].text += parsed.text;
                  }
                  return updated;
                });
              } catch { /* empty */ }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="chat-area">
      <div className="messages-window">
        {(!messages || messages.length === 0) && (
          <div className="welcome-hero">How can I help you today?</div>
        )}

        {messages && messages.map((m, i) => {
          const isUser = m.role === 'user';

          return (
            <div key={i} className={`message-row ${isUser ? 'user-row' : 'model-row'}`}>
              <div className="avatar">
                {isUser ? (
                  user?.email ? user.email.charAt(0).toUpperCase() : 'U'
                ) : (
                  'G'
                )}
              </div>

              <div className="bubble-container">
                <div className="bubble">
                  {isUser && m.imageUrl && (
                    <div
                      className="chat-attached-image-container"
                      style={{
                        marginBottom: '10px',
                        maxWidth: '200px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #3c4043'
                      }}
                    >
                      <img
                        src={m.imageUrl}
                        alt="User attachment history"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>
                  )}
                  <ReactMarkdown
                    components={{
                      code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        
                        // Multi-line code block (Remains styled with syntax highlighter)
                        if (!inline && match) {
                          return (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              className="code-block-syntax"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          );
                        }

                        // 👈 FIX: Strips out the background layout completely for inline code snippets
                        return (
                          <code 
                            className={className} 
                            style={{ 
                              background: 'none', 
                              backgroundColor: 'transparent', 
                              padding: '0', 
                              color: 'inherit' 
                            }} 
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {m.text || '...'}
                  </ReactMarkdown>
                </div>

                {!isUser && m.text && !m.isError && (
                  <div className="message-actions">
                    <button
                      onClick={() => handleCopy(m.text, i)}
                      className="copy-btn"
                      title="Copy response"
                    >
                      {copiedId === i ? <Check size={16} className="copied" /> : <Copy size={16} />}
                      <span>{copiedId === i ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-panel-wrapper" style={{ position: 'absolute', bottom: '25px', left: '20%', right: '20%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {imagePreviewUrl && (
          <div className="image-preview-node" style={{ position: 'relative', width: '65px', height: '65px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #00bcd4', background: '#1e1f20', alignSelf: 'flex-start', marginLeft: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
            <img src={imagePreviewUrl} alt="staged upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={removeSelectedImage}
              style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="input-container" style={{ position: 'static', left: '0', right: '0', width: '100%' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{ color: selectedImage ? '#00bcd4' : '#80868b', marginRight: '5px' }}
            title="Attach an image"
          >
            <Image size={20} />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask GemClone anything or upload an image..."
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}