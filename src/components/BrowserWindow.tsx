import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';

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

const BrowserWindow = forwardRef<{ setUrl: (url: string) => void }, BrowserWindowProps>(
  ({ id, initialUrl = '', onSaveBookmark, onColorChange, currentColor, onResize }, ref) => {
    const [url, setUrl] = useState(initialUrl);
    const [loading, setLoading] = useState(false);
    const [showBookmarkInput, setShowBookmarkInput] = useState(false);
    const [bookmarkTitle, setBookmarkTitle] = useState('');
    const [isResizing, setIsResizing] = useState(false);
    const windowRef = useRef<HTMLDivElement>(null);
    const resizeStartPos = useRef({ x: 0, y: 0 });
    const originalSize = useRef({ width: 0, height: 0 });

    useImperativeHandle(ref, () => ({
      setUrl: (newUrl: string) => {
        setUrl(newUrl);
        handleUrlSubmit(null, newUrl);
      },
    }));

    const handleUrlSubmit = (e: React.FormEvent | null, bookmarkUrl?: string) => {
      if (e) e.preventDefault();
      setLoading(true);
      
      const targetUrl = bookmarkUrl || url;
      const iframe = document.querySelector(`#browser-frame-${id}`) as HTMLIFrameElement;
      if (iframe) {
        iframe.src = targetUrl;
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

    useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };
    }, []);

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
              placeholder="Enter URL"
              className="url-input"
            />
            <button type="submit" className="go-button">
              Go
            </button>
          </form>
          <div className="window-controls">
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
            id={`browser-frame-${id}`}
            src={initialUrl}
            title={`browser-window-${id}`}
            className="browser-iframe"
            onLoad={() => setLoading(false)}
          />
          {loading && (
            <div className="loading-indicator">
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