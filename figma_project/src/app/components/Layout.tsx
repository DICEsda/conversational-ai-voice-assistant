import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

export default function Layout() {
  const location = useLocation();
  const isExpanded = location.pathname !== '/';
  const cardRef = useRef<HTMLDivElement>(null);

  // Resize Electron window to match card size
  useEffect(() => {
    if (!window.electronAPI) return; // Not in Electron

    const resizeWindow = () => {
      if (cardRef.current && window.electronAPI) {
        const { offsetWidth, offsetHeight } = cardRef.current;
        window.electronAPI.window.resize(offsetWidth, offsetHeight);
      }
    };

    // Initial resize
    resizeWindow();

    // Watch for card size changes
    const observer = new ResizeObserver(() => {
      resizeWindow();
    });

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Update window size when card animates
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const timer = setTimeout(() => {
      if (cardRef.current && window.electronAPI) {
        const { offsetWidth, offsetHeight } = cardRef.current;
        window.electronAPI.window.resize(offsetWidth, offsetHeight);
      }
    }, 450); // Slightly after animation completes (400ms)

    return () => clearTimeout(timer);
  }, [isExpanded]);

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  return (
    <div 
      className={isElectron ? "" : "flex items-center justify-center min-h-screen"}
      style={{ 
        background: isElectron ? 'transparent' : '#f3f4f6',
        width: isElectron ? '100vw' : undefined,
        height: isElectron ? '100vh' : undefined,
        overflow: 'hidden'
      }}
    >
      <motion.div 
        ref={cardRef}
        className="relative bg-[#f5dcc4] shadow-lg rounded-2xl"
        animate={{ 
          width: isExpanded ? 315 : 190,
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1] 
        }}
        style={{ 
          height: '315px',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        onAnimationComplete={() => {
          // Trigger resize after animation completes
          if (cardRef.current && window.electronAPI) {
            const { offsetWidth, offsetHeight } = cardRef.current;
            console.log('Animation complete, resizing to:', offsetWidth, offsetHeight);
            window.electronAPI.window.resize(offsetWidth, offsetHeight);
          }
        }}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full"
        >
          <Outlet />
        </motion.div>
      </motion.div>
    </div>
  );
}
