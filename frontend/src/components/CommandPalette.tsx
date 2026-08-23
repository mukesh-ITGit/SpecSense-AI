import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, LayoutDashboard, FileText, UploadCloud, Layers, CheckCircle, ShieldAlert, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CommandPalette.css';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const commands = [
    { name: 'Overview Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Enrich Product', path: '/enrich', icon: <FileText size={18} /> },
    { name: 'Bulk Upload', path: '/upload', icon: <UploadCloud size={18} /> },
    { name: 'Products Catalog', path: '/products', icon: <Layers size={18} /> },
    { name: 'Review Queue', path: '/review', icon: <CheckCircle size={18} /> },
    { name: 'Conflict Center', path: '/conflicts', icon: <ShieldAlert size={18} /> },
    { name: 'Catalog Quality', path: '/quality', icon: <Activity size={18} /> },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        navigate(filteredCommands[selectedIndex].path, { state: { from: location.pathname + location.search } });
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, navigate, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="command-overlay" 
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div 
            className="command-palette" 
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
        <div className="command-header">
          <Search size={20} className="command-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, products, or pages..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="command-esc">ESC</div>
        </div>
        
        <div className="command-body">
          {filteredCommands.length > 0 ? (
            <div className="command-group">
              <div className="command-group-title">Navigation</div>
              {filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.path}
                  className={`command-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    navigate(cmd.path, { state: { from: location.pathname + location.search } });
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  {cmd.icon}
                  <span>{cmd.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="command-empty">
              No results found for "{query}"
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
