import React, { useState } from 'react';

interface Bookmark {
  url: string;
  title: string;
  targetWindow: string;
  windowColor: string;
}

interface BookmarkManagerProps {
  bookmarks: Bookmark[];
  onLoadBookmark: (url: string, windowId: string) => void;
  onDeleteBookmark: (index: number) => void;
  availableWindows: string[];
}

const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  bookmarks,
  onLoadBookmark,
  onDeleteBookmark,
  availableWindows,
}) => {
  const [selectedWindows, setSelectedWindows] = useState<{ [key: number]: string }>({});

  const handleWindowSelect = (index: number, windowId: string) => {
    setSelectedWindows(prev => ({
      ...prev,
      [index]: windowId
    }));
  };

  return (
    <div className="bookmark-manager">
      <h2>Bookmarks</h2>
      <div className="bookmarks-list">
        {bookmarks.map((bookmark, index) => (
          <div key={index} className="bookmark-item">
            <div className="bookmark-info">
              <span className="bookmark-title">{bookmark.title}</span>
              <span className="bookmark-url">{bookmark.url}</span>
              <span className="bookmark-window">Window {bookmark.targetWindow.slice(-1)}</span>
            </div>
            <div className="bookmark-actions">
              <select
                className="window-select"
                value={selectedWindows[index] || bookmark.targetWindow}
                onChange={(e) => handleWindowSelect(index, e.target.value)}
                title="Select target window"
              >
                {availableWindows.map((windowId) => (
                  <option key={windowId} value={windowId}>
                    Window {windowId.slice(-1)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onLoadBookmark(bookmark.url, selectedWindows[index] || bookmark.targetWindow)}
                className="load-button"
                title="Load in selected window"
              >
                Load
              </button>
              <button
                onClick={() => onDeleteBookmark(index)}
                className="delete-button"
                title="Delete bookmark"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {bookmarks.length === 0 && (
          <div className="no-bookmarks">
            No bookmarks yet. Click the ☆ button in any window to add bookmarks.
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkManager; 