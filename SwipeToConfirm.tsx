import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';

type SwipeToConfirmProps = {
  onSwipeProgress: (progress: number) => void;
  onSwipeComplete: () => void;
  swipeThreshold?: number;
};

export function SwipeToConfirm({ 
  onSwipeProgress, 
  onSwipeComplete, 
  swipeThreshold = 98 // Increased threshold to require nearly full swipe
}: SwipeToConfirmProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [endX, setEndX] = useState(0);
  const [isInConfirmZone, setIsInConfirmZone] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxDistance = useRef(0);
  
  const calculateProgress = (current: number, max: number): number => {
    const progress = (current / max) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };
  
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    
    if (containerRef.current && sliderRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      maxDistance.current = containerRect.width - sliderRef.current.offsetWidth;
    }
  };
  
  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const delta = clientX - startX;
    const newEndX = Math.min(Math.max(delta, 0), maxDistance.current);
    setEndX(newEndX);
    
    // Calculate progress percentage
    const progress = calculateProgress(newEndX, maxDistance.current);
    onSwipeProgress(progress);
    
    // Check if in confirm zone but DO NOT complete yet
    setIsInConfirmZone(progress >= swipeThreshold);
  };
  
  const handleEnd = () => {
    if (!isDragging) return;
    
    const progress = calculateProgress(endX, maxDistance.current);
    
    if (progress >= swipeThreshold) {
      // Only complete if released in confirm zone
      setEndX(maxDistance.current);
      onSwipeComplete();
    } else {
      // Reset position if not in confirm zone
      setEndX(0);
      onSwipeProgress(0);
    }
    
    setIsInConfirmZone(false);
    setIsDragging(false);
  };
  
  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const handleMouseUp = () => handleEnd();
  
  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = () => handleEnd();
  
  // Add document event listeners for mouse/touch move and up/end
  useEffect(() => {
    if (isDragging) {
      const mouseMoveHandler = (e: MouseEvent) => handleMove(e.clientX);
      const mouseUpHandler = () => handleEnd();
      const touchMoveHandler = (e: TouchEvent) => handleMove(e.touches[0].clientX);
      const touchEndHandler = () => handleEnd();
      
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      document.addEventListener('touchmove', touchMoveHandler);
      document.addEventListener('touchend', touchEndHandler);
      
      return () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('touchmove', touchMoveHandler);
        document.removeEventListener('touchend', touchEndHandler);
      };
    }
  }, [isDragging]);
  
  const progress = calculateProgress(endX, maxDistance.current);
  
  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg"
    >
      {/* Background bar that shows progress */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-red-100 to-red-200 transition-opacity duration-300 z-5"
        style={{ 
          width: `${progress}%`,
          opacity: isDragging ? (isInConfirmZone ? 1 : 0.6) : 0,
          visibility: progress > 0 ? 'visible' : 'hidden'
        }}
      />

      {/* Slider thumb */}
      <div 
        ref={sliderRef}
        style={{ 
          transform: `translateX(${endX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}
        className={`absolute top-0 left-0 h-full w-12 flex items-center justify-center rounded-lg cursor-pointer shadow-md z-20
          ${isInConfirmZone ? 'bg-red-600' : 'bg-red-500'}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        <ArrowRight className="text-white" size={18} />
      </div>
      
      {/* Text indicator - centered and positioned behind the slider with proper z-index */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-600 text-sm font-medium z-0">
        <span className="whitespace-nowrap px-4">{isInConfirmZone ? "Deixa anar per confirmar" : "Llisca fins al final per confirmar"}</span>
      </div>
    </div>
  );
}

export default SwipeToConfirm;
