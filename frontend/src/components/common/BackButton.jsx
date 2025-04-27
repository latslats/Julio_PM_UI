import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

const BackButton = ({ to = -1, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof to === 'string') {
      navigate(to);
    } else {
      navigate(to); // Navigate back in history
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={`mb-4 ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
};

export default BackButton;
