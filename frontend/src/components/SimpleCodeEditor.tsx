import React, { useRef, useEffect } from 'react';

const SimpleCodeEditor = ({ value, onChange, placeholder, required = false }) => {
  const textareaRef = useRef(null);
  const preRef = useRef(null); // Added ref for pre tag
  const containerRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (textarea && container) {
      // Temporarily reset height to get the new scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      
      // Set the new height
      const newHeight = `${scrollHeight}px`;
      textarea.style.height = newHeight;
      container.style.height = newHeight;
    }
  }, [value]);

  const handleScroll = (e) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const highlight = (text) => {
    if (!text) return '';
    // Basic YAML-like highlighting
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      // Keywords (at the start of a line, indented)
      .replace(/^(\s*)(\w+):/gm, '$1<span class="text-accent">$2</span>:')
      // Comments - changed from text-gray-500 to text-gray-400 for better visibility
      .replace(/(#.*$)/gm, '<span class="text-gray-400">$1</span>')
      // String values after a colon
      .replace(/:\s*(".*?"|'.*?'|`.*?`|\|.*)/g, ':<span class="text-green-400">$1</span>')
      // Boolean/null values
      .replace(/\b(true|false|null)\b/g, '<span class="text-purple-400">$1</span>');
  };

  return (
    <div ref={containerRef} className="relative font-mono text-sm bg-dark-bg-secondary shadow-neo-inset rounded-lg" style={{ minHeight: '120px' }}>
      <textarea
        ref={textareaRef}
        onScroll={handleScroll}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={1}
        className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-white resize-none outline-none no-scrollbar"
        spellCheck="false"
        required={required}
      />
      <pre ref={preRef} className="absolute inset-0 w-full h-full p-3 rounded-lg overflow-hidden pointer-events-none no-scrollbar text-gray-200" aria-hidden="true">
        <code dangerouslySetInnerHTML={{ __html: highlight(value) + '\n' }} />
      </pre>
    </div>
  );
};

export default SimpleCodeEditor;