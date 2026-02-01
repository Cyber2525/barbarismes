/**
 * Smoothly scrolls to the top of the page with enhanced animation
 * Works in all browsers, even those that don't support behavior: 'smooth'
 */
export function scrollToTop(duration = 500) {
  if (typeof window === 'undefined') return;
  
  // Use native smooth scrolling if available
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    return;
  }
  
  // Fallback for browsers that don't support smooth scrolling
  const startPosition = window.pageYOffset;
  const startTime = performance.now();
  
  function scrollStep(timestamp: number) {
    const currentTime = timestamp - startTime;
    const progress = Math.min(currentTime / duration, 1);
    
    // Easing function for smoother acceleration/deceleration
    const easeInOutCubic = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
    window.scrollTo(0, startPosition * (1 - easeInOutCubic));
    
    if (currentTime < duration) {
      window.requestAnimationFrame(scrollStep);
    }
  }
  
  window.requestAnimationFrame(scrollStep);
}
