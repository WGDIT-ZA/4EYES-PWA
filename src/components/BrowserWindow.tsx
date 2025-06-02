import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import BonjourDiscovery from './BonjourDiscovery';

interface BrowserWindowProps {
  id: string;
  initialUrl?: string;
  onSaveBookmark: (url: string, title: string, windowId: string, color: string) => void;
  onColorChange: (color: string) => void;
  currentColor: string;
  onResize?: (id: string, width: number, height: number) => void;
}

const COLORS = {
  default: '#404040',
  red: '#ff4444',
  blue: '#4444ff',
  yellow: '#ffff44',
  green: '#44ff44',
  cyan: '#44ffff',
  magenta: '#ff44ff',
  pink: '#ff99cc',
  grey: '#888888',
  black: '#000000',
};

const formatUrl = (url: string): string => {
  if (!url) return '';
  
  // Handle localhost and IP addresses
  if (url.match(/^(localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)) {
    return url.startsWith('http') ? url : `http://${url}`;
  }
  
  // If it's already a valid URL, return it
  try {
    new URL(url);
    return url;
  } catch {
    // If it doesn't have a protocol, add https://
    if (!url.match(/^[a-zA-Z]+:\/\//)) {
      return `https://${url}`;
    }
    return url;
  }
};

const getProxiedUrl = (url: string): string => {
  const formattedUrl = formatUrl(url);
  if (!formattedUrl) return '';
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(formattedUrl)}`;
};

const BrowserWindow = forwardRef<{ setUrl: (url: string) => void }, BrowserWindowProps>(
  ({ id, initialUrl = '', onSaveBookmark, onColorChange, currentColor, onResize }, ref) => {
    const [url, setUrl] = useState(initialUrl);
    const [loading, setLoading] = useState(false);
    const [showBookmarkInput, setShowBookmarkInput] = useState(false);
    const [showBonjourDiscovery, setShowBonjourDiscovery] = useState(false);
    const [bookmarkTitle, setBookmarkTitle] = useState('');
    const [isResizing, setIsResizing] = useState(false);
    const [keepAliveActive, setKeepAliveActive] = useState(false);
    const [pingLatency, setPingLatency] = useState<number | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
    const windowRef = useRef<HTMLDivElement>(null);
    const resizeStartPos = useRef({ x: 0, y: 0 });
    const originalSize = useRef({ width: 0, height: 0 });
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const pingIntervalRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      setUrl: (newUrl: string) => {
        const formattedUrl = formatUrl(newUrl);
        setUrl(formattedUrl);
        handleUrlSubmit(null, formattedUrl);
      },
    }));

    const handleUrlSubmit = (e: React.FormEvent | null, bookmarkUrl?: string) => {
      if (e) e.preventDefault();
      setLoading(true);
      
      const targetUrl = formatUrl(bookmarkUrl || url);
      if (iframeRef.current) {
        iframeRef.current.src = targetUrl;
        setUrl(targetUrl);
      }
    };

    const handleSaveBookmark = (e: React.FormEvent) => {
      e.preventDefault();
      onSaveBookmark(url, bookmarkTitle || url, id, currentColor);
      setShowBookmarkInput(false);
      setBookmarkTitle('');
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newColor = e.target.value as keyof typeof COLORS;
      onColorChange(newColor);
    };

    const startResize = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartPos.current = { x: e.clientX, y: e.clientY };
      if (windowRef.current) {
        originalSize.current = {
          width: windowRef.current.offsetWidth,
          height: windowRef.current.offsetHeight,
        };
      }
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
    };

    const handleResize = (e: MouseEvent) => {
      if (!isResizing || !windowRef.current) return;

      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;

      const newWidth = originalSize.current.width + deltaX;
      const newHeight = originalSize.current.height + deltaY;

      // Apply minimum size constraints
      const width = Math.max(300, newWidth);
      const height = Math.max(200, newHeight);

      windowRef.current.style.width = `${width}px`;
      windowRef.current.style.height = `${height}px`;

      if (onResize) {
        onResize(id, width, height);
      }
    };

    const stopResize = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    };

    const pingUrl = async () => {
      const startTime = performance.now();
      setConnectionStatus('checking');
      
      // Extract hostname from URL
      let targetUrl = url;
      try {
        const urlObj = new URL(url);
        targetUrl = urlObj.hostname;
      } catch {
        // If URL parsing fails, use the raw URL (might be just an IP)
        targetUrl = url.replace(/^https?:\/\//, '').split('/')[0];
      }

      try {
        // Try WebSocket connection first
        const wsProtocol = url.startsWith('https') ? 'wss' : 'ws';
        const ws = new WebSocket(`${wsProtocol}://${targetUrl}`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            ws.close();
            reject(new Error('Timeout'));
          }, 2000);
        });

        const connectPromise = new Promise((resolve, reject) => {
          ws.onopen = () => {
            ws.close();
            resolve(true);
          };
          ws.onerror = () => {
            ws.close();
            reject(new Error('WebSocket connection failed'));
          };
        });

        await Promise.race([connectPromise, timeoutPromise]);
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        setPingLatency(latency);
        setConnectionStatus('connected');
      } catch (wsError) {
        console.error('WebSocket ping error:', wsError);
        
        // Fallback to HTTP request for non-local addresses
        try {
          if (!targetUrl.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|localhost)/)) {
            const response = await fetch(url, {
              mode: 'no-cors',
              cache: 'no-cache',
            });
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            setPingLatency(latency);
            setConnectionStatus('connected');
            return;
          }
        } catch (httpError) {
          console.error('HTTP ping error:', httpError);
        }
        
        setPingLatency(null);
        setConnectionStatus('disconnected');
      }
    };

    const toggleKeepAlive = () => {
      if (!keepAliveActive) {
        setKeepAliveActive(true);
        pingUrl(); // Initial ping
        pingIntervalRef.current = window.setInterval(pingUrl, 2000); // Ping every 2 seconds
      } else {
        setKeepAliveActive(false);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        setPingLatency(null);
        setConnectionStatus('disconnected');
      }
    };

    const handleBonjourServiceSelect = (service: { address: string; port: number }) => {
      const newUrl = `http://${service.address}:${service.port}`;
      setUrl(newUrl);
      handleUrlSubmit(null, newUrl);
      setShowBonjourDiscovery(false);
    };

    useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
      };
    }, []);

    // Reset keep-alive when URL changes
    useEffect(() => {
      if (keepAliveActive) {
        toggleKeepAlive(); // Turn off
        toggleKeepAlive(); // Turn on with new URL
      }
    }, [url]);

    return (
      <div 
        className={`browser-window ${isResizing ? 'resizing' : ''}`}
        ref={windowRef}
        style={{ 
          borderColor: COLORS[currentColor as keyof typeof COLORS],
          position: 'relative'
        }}
      >
        <div className="browser-toolbar">
          <form onSubmit={(e) => handleUrlSubmit(e)} className="url-form">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL (e.g., http://localhost:3000 or example.com)"
              className="url-input"
            />
            <button type="submit" className="go-button">
              Go
            </button>
          </form>
          <div className="window-controls">
            <div className="keep-alive-control" style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
              <button
                onClick={toggleKeepAlive}
                className={`keep-alive-button ${keepAliveActive ? 'active' : ''}`}
                style={{
                  padding: '4px 8px',
                  backgroundColor: keepAliveActive ? '#44ff44' : '#404040',
                  border: 'none',
                  borderRadius: '4px',
                  color: keepAliveActive ? '#000' : '#fff',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                {keepAliveActive ? 'Stop Ping' : 'Start Ping'}
              </button>
              {keepAliveActive && (
                <div className="ping-status" style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    className="status-indicator"
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor:
                        connectionStatus === 'connected' ? '#44ff44' :
                        connectionStatus === 'checking' ? '#ffff44' : '#ff4444',
                      marginRight: '4px'
                    }}
                  />
                  {pingLatency !== null && (
                    <span style={{ fontSize: '12px', color: '#fff' }}>
                      {pingLatency}ms
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowBonjourDiscovery(!showBonjourDiscovery)}
              style={{
                padding: '4px 8px',
                backgroundColor: showBonjourDiscovery ? '#44ff44' : '#404040',
                border: 'none',
                borderRadius: '4px',
                color: showBonjourDiscovery ? '#000' : '#fff',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              🔍 Network
            </button>
            <button
              className="bookmark-toggle-button"
              onClick={() => setShowBookmarkInput(!showBookmarkInput)}
              title={showBookmarkInput ? "Cancel bookmark" : "Add bookmark"}
            >
              {showBookmarkInput ? '★' : '☆'}
            </button>
            <select
              value={currentColor}
              onChange={handleColorChange}
              className="color-select"
            >
              {Object.keys(COLORS).map((color) => (
                <option key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showBonjourDiscovery && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, width: '300px', marginTop: '4px' }}>
            <BonjourDiscovery onServiceSelect={handleBonjourServiceSelect} />
          </div>
        )}

        {showBookmarkInput && (
          <form onSubmit={handleSaveBookmark} className="bookmark-form-inline">
            <input
              type="text"
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              placeholder="Enter bookmark title"
              className="bookmark-input"
            />
            <button type="submit" className="save-bookmark-button">
              Save
            </button>
          </form>
        )}

        <div className="browser-content">
          <iframe
            ref={iframeRef}
            id={`browser-frame-${id}`}
            src={initialUrl ? formatUrl(initialUrl) : ''}
            title={`browser-window-${id}`}
            className="browser-iframe"
            onLoad={() => setLoading(false)}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-presentation allow-top-navigation allow-top-navigation-by-user-activation allow-downloads"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone; geolocation"
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#fff'
            }}
          />
          {loading && (
            <div className="loading-indicator" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              Loading...
            </div>
          )}
        </div>
        <div className="resize-handle" onMouseDown={startResize}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path 
              d="M11 11L15 15M7 11L15 11M11 7L15 7M11 15L11 7" 
              stroke="currentColor" 
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    );
  }
);

export default BrowserWindow; 