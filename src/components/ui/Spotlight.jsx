import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export const Spotlight = ({
  children,
  className,
}) => {
  const divRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
  
    const node = divRef.current; // ✅ store current value
  
    const handleMouseMove = (e) => {
      if (!node) return;
  
      const rect = node.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
  
    node?.addEventListener('mousemove', handleMouseMove);
  
    return () => {
      node?.removeEventListener('mousemove', handleMouseMove); // ✅ cleanup uses local `node`
    };
  }, [isMounted]);
  

  return (
    <div ref={divRef} className={cn('relative overflow-hidden', className)}>
      <div
        className="pointer-events-none absolute inset-0 z-10 transition duration-300"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(29,78,216,0.15), transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
};
