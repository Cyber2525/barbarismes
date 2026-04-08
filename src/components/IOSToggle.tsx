import React, { useState, useRef, useEffect } from 'react';

interface IOSToggleProps {
  /** Whether the toggle is ON or OFF */
  checked: boolean;
  /** Callback when the toggle state changes */
  onChange: (checked: boolean) => void;
  /** Optional additional classes */
  className?: string;
  /** Optional disabled state */
  disabled?: boolean;
  /** Scale factor for the toggle (default 1) */
  scale?: number;
}

/**
 * A reusable, iOS-style toggle switch component.
 * Handles touch gestures, snapping animations, and proximity-based knob expansion.
 */
export const IOSToggle: React.FC<IOSToggleProps> = ({ 
  checked, 
  onChange, 
  className = '',
  disabled = false,
  scale = 1
}) => {
  // --- Interaction State ---
  const [isPressed, setIsPressed] = useState(false);
  // Track if the finger is close enough horizontally to keep the knob expanded
  const [isNear, setIsNear] = useState(true);
  // optimisticMode tracks the VISUAL state during drag.
  const [optimisticMode, setOptimisticMode] = useState<boolean | null>(null);
  
  // Refs for gesture tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const hasDragged = useRef(false);

  // We need a ref to access the latest state/props inside the global event listeners
  const stateRef = useRef({ checked, optimisticMode, disabled, scale });
  
  useEffect(() => {
    stateRef.current = { checked, optimisticMode, disabled, scale };
  }, [checked, optimisticMode, disabled, scale]);

  const listenersRef = useRef<{move: (e: PointerEvent) => void, up: (e: PointerEvent) => void} | null>(null);

  // Constants for toggle dimensions
  const CONTAINER_WIDTH = 51;
  const PADDING = 2;
  const KNOB_NORMAL_WIDTH = 27;
  const KNOB_EXPANDED_WIDTH = 33; 
  const HORIZONTAL_PROXIMITY_THRESHOLD = 80; // Distance in pixels to shrink knob back horizontally

  const cleanupListeners = () => {
    if (listenersRef.current) {
      window.removeEventListener('pointermove', listenersRef.current.move);
      window.removeEventListener('pointerup', listenersRef.current.up);
      window.removeEventListener('pointercancel', listenersRef.current.up);
      listenersRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    setIsPressed(true);
    setIsNear(true); // Initially near
    setOptimisticMode(checked);
    hasDragged.current = false;
    startX.current = e.clientX;

    cleanupListeners();

    const handleGlobalMove = (e: PointerEvent) => {
      const { disabled, scale, checked, optimisticMode } = stateRef.current;
      if (disabled) return;

      // --- Proximity Logic ---
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          
          // Calculate only horizontal distance
          // The user requested that vertical distance should NOT trigger the shrink effect
          const horizontalDist = Math.abs(e.clientX - centerX);
          
          // Only expand if pointer is within horizontal threshold
          setIsNear(horizontalDist < HORIZONTAL_PROXIMITY_THRESHOLD);
      }

      const currentX = e.clientX;
      const diff = (currentX - startX.current) / scale;
      const currentVisual = optimisticMode !== null ? optimisticMode : checked;

      // Magnetic Snap Logic
      if (Math.abs(diff) > 5) {
          hasDragged.current = true;
          
          if (diff > 0 && !currentVisual) {
              setOptimisticMode(true);
              startX.current = currentX; 
          } else if (diff < 0 && currentVisual) {
              setOptimisticMode(false);
              startX.current = currentX;
          }
      }
    };

    const handleGlobalUp = (e: PointerEvent) => {
      cleanupListeners();
      
      const { disabled, checked, optimisticMode } = stateRef.current;
      if (disabled) return;
      
      setIsPressed(false);
      setIsNear(true);
      
      if (hasDragged.current && optimisticMode !== null) {
          if (optimisticMode !== checked) {
              onChange(optimisticMode);
          }
      } else {
          onChange(!checked);
      }
      
      setOptimisticMode(null);
    };

    listenersRef.current = { move: handleGlobalMove, up: handleGlobalUp };
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
  };

  useEffect(() => {
    return cleanupListeners;
  }, []);

  // --- Rendering Calculations ---

  const activeMode = optimisticMode !== null ? optimisticMode : checked;
  // Knob expands only if pressed AND finger is horizontally near
  const currentKnobWidth = (isPressed && isNear) ? KNOB_EXPANDED_WIDTH : KNOB_NORMAL_WIDTH;
  
  const activePos = CONTAINER_WIDTH - PADDING - currentKnobWidth;
  const inactivePos = PADDING;
  const currentPos = activeMode ? activePos : inactivePos;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{
        width: 51 * scale,
        height: 31 * scale,
      }}
    >
        <div 
        onPointerDown={handlePointerDown}
        className={`absolute top-0 left-0 w-[51px] h-[31px] rounded-full touch-none select-none transition-colors duration-300 
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${activeMode ? 'bg-red-500' : 'bg-[#E9E9EA]'} 
        `}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
        }}
        >
            {/* The Knob */}
            <div 
                className="absolute top-[2px] h-[27px] bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.1)] z-10"
                style={{
                    width: `${currentKnobWidth}px`,
                    left: `${currentPos}px`,
                    transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)'
                }}
            />
        </div>
    </div>
  );
};
