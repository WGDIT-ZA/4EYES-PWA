import React, { useRef, useState, useEffect } from 'react';
import BrowserWindow from './BrowserWindow';
import BookmarkManager from './BookmarkManager';

interface Bookmark {
  url: string;
  title: string;
  targetWindow: string;
  windowColor: string;
}

type LayoutType = '1' | '2' | '4';

const LAYOUT_CONFIGS = {
  '1': { windows: ['window1'], className: 'grid-layout-single' },
  '2': { windows: ['window1', 'window2'], className: 'grid-layout-double' },
  '4': { windows: ['window1', 'window2', 'window3', 'window4'], className: 'grid-layout-quad' },
};

const GridLayout: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('4');
  const [isBookmarkManagerOpen, setIsBookmarkManagerOpen] = useState(false);
  
  const windowRefs = {
    window1: useRef<{ setUrl: (url: string) => void }>(null),
    window2: useRef<{ setUrl: (url: string) => void }>(null),
    window3: useRef<{ setUrl: (url: string) => void }>(null),
    window4: useRef<{ setUrl: (url: string) => void }>(null),
  };

  const [windowColors, setWindowColors] = useState({
    window1: 'default',
    window2: 'default',
    window3: 'default',
    window4: 'default',
  });

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bookmarks');
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
  }, []);

  const windows = LAYOUT_CONFIGS[currentLayout].windows.map(id => ({
    id,
    initialUrl: '',
  }));

  const handleLoadBookmark = (url: string, windowId: string) => {
    const windowRef = windowRefs[windowId as keyof typeof windowRefs];
    if (windowRef.current) {
      windowRef.current.setUrl(url);
    }
  };

  const handleSaveBookmark = (url: string, title: string, windowId: string, color: string) => {
    const newBookmark: Bookmark = {
      url,
      title,
      targetWindow: windowId,
      windowColor: color,
    };
    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
  };

  const handleColorChange = (windowId: string, color: string) => {
    setWindowColors(prev => ({
      ...prev,
      [windowId]: color
    }));
  };

  const handleLayoutChange = (layout: LayoutType) => {
    setCurrentLayout(layout);
  };

  const toggleBookmarkManager = () => {
    setIsBookmarkManagerOpen(!isBookmarkManagerOpen);
  };

  return (
    <div className="app-layout">
      <div className="windows-container">
        <div className="layout-controls">
          <label>Layout: </label>
          <div className="layout-buttons">
            <button
              className={`layout-button ${currentLayout === '1' ? 'active' : ''}`}
              onClick={() => handleLayoutChange('1')}
              title="Single window"
            >
              <div className="layout-icon single" />
            </button>
            <button
              className={`layout-button ${currentLayout === '2' ? 'active' : ''}`}
              onClick={() => handleLayoutChange('2')}
              title="Two windows"
            >
              <div className="layout-icon double" />
            </button>
            <button
              className={`layout-button ${currentLayout === '4' ? 'active' : ''}`}
              onClick={() => handleLayoutChange('4')}
              title="Four windows"
            >
              <div className="layout-icon quad" />
            </button>
          </div>
        </div>
        <div className={`grid-layout ${LAYOUT_CONFIGS[currentLayout].className}`}>
          {windows.map((window) => (
            <BrowserWindow
              key={window.id}
              id={window.id}
              initialUrl={window.initialUrl}
              ref={windowRefs[window.id as keyof typeof windowRefs]}
              onSaveBookmark={handleSaveBookmark}
              onColorChange={(color) => handleColorChange(window.id, color)}
              currentColor={windowColors[window.id as keyof typeof windowColors]}
            />
          ))}
        </div>
      </div>
      <button
        className={`bookmark-toggle ${isBookmarkManagerOpen ? 'open' : ''}`}
        onClick={toggleBookmarkManager}
        title={isBookmarkManagerOpen ? "Close bookmarks" : "Open bookmarks"}
      >
        {isBookmarkManagerOpen ? '×' : '☆'}
      </button>
      <div className={`sidebar ${isBookmarkManagerOpen ? 'open' : ''}`}>
        <BookmarkManager
          onLoadBookmark={handleLoadBookmark}
          bookmarks={bookmarks}
          onDeleteBookmark={(index) => {
            const updatedBookmarks = bookmarks.filter((_, i) => i !== index);
            setBookmarks(updatedBookmarks);
            localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
          }}
          availableWindows={LAYOUT_CONFIGS[currentLayout].windows}
        />
      </div>
      <div 
        className={`overlay ${isBookmarkManagerOpen ? 'visible' : ''}`}
        onClick={() => setIsBookmarkManagerOpen(false)}
      />
    </div>
  );
};

export default GridLayout; 