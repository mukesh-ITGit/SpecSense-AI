import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './BackButton.css';

interface BackButtonProps {
  fallbackUrl?: string;
  onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ fallbackUrl = '/', onClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    
    if (location.state && location.state.from) {
      const from = location.state.from;
      const validRoutes = ['/overview', '/enrich', '/upload', '/products', '/review', '/conflicts', '/catalog-quality', '/settings', '/profile', '/'];
      
      const baseUrl = from.split('?')[0];
      if (validRoutes.includes(baseUrl) || baseUrl === '/') {
        navigate(from);
        return;
      }
    }

    navigate(fallbackUrl);
  };

  return (
    <button className="back-button" onClick={handleBack} aria-label="Go back">
      <ArrowLeft size={16} />
      <span>Back</span>
    </button>
  );
};

export default BackButton;
