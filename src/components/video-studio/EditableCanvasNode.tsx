"use client"

import React, { useRef } from 'react';
import { motion } from 'framer-motion';

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  scaleY?: number;
  opacity?: number;
  zIndex?: number;
}

interface EditableCanvasNodeProps {
  id: string;
  transform: Transform;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newTransform: Transform) => void;
  children: React.ReactNode;
  isDraggable?: boolean;
  isResizable?: boolean;
  zIndex?: number;
}

export function EditableCanvasNode({ transform, isSelected, onSelect, onChange, children, isDraggable = true, isResizable = true, zIndex }: EditableCanvasNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Dragging logic for the body
  const handleDragEnd = (_e: unknown, info: { offset: { x: number; y: number } }) => {
    // Info offset is relative to where drag started
    onChange({
      ...transform,
      x: transform.x + info.offset.x,
      y: transform.y + info.offset.y
    });
  };

  // Rotation logic
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startX = e.clientX;
    const startRot = transform.rotation;
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * 180 / Math.PI;
      // Start angle offset
      const startAngle = Math.atan2(startY - centerY, startX - centerX) * 180 / Math.PI;
      let newRot = startRot + (angle - startAngle);
      
      // Snap to 15 degrees if shift is pressed
      if (moveEvent.shiftKey) {
        newRot = Math.round(newRot / 15) * 15;
      }
      
      onChange({ ...transform, rotation: newRot });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resize logic
  const handleResizeStart = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startScale = transform.scale;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      
      let newScale = startScale;
      // Simplistic proportional scale for corner handles
      if (type.includes('se')) {
         newScale = startScale + (dx / 2);
      } else if (type.includes('sw')) {
         newScale = startScale - (dx / 2);
      } else if (type.includes('ne')) {
         newScale = startScale + (dx / 2);
      } else if (type.includes('nw')) {
         newScale = startScale - (dx / 2);
      }
      
      // Ensure minimum scale
      if (newScale < 10) newScale = 10;
      
      onChange({ ...transform, scale: newScale });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div
      ref={nodeRef}
      className="absolute cursor-move"
      style={{
        left: !isResizable ? 0 : '50%',
        top: '50%',
        width: !isResizable ? '100%' : 0,
        height: 0,
        zIndex: zIndex !== undefined ? zIndex : (isSelected ? 60 : 50),
      }}
      animate={{
        x: transform.x,
        y: transform.y,
        scale: transform.scale / 100,
        rotate: transform.rotation,
      }}
      transition={{ type: 'tween', duration: 0 }}
      drag={isDraggable}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onMouseDown={() => {
        onSelect();
      }}
    >
      <div 
         className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center ${!isResizable ? 'left-0 w-full px-[5%]' : 'left-1/2 -translate-x-1/2'} ${isSelected ? 'ring-1 ring-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.3)]' : ''}`}
      >
        {children}
        
        {/* Selection UI overlay (handles) */}
        {isSelected && isResizable && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Rotation Handle */}
            <div 
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border border-[#6366F1] rounded-full pointer-events-auto cursor-crosshair z-50 hover:bg-[#6366F1] transition-colors"
              onMouseDown={handleRotateStart}
            />
            <div className="absolute -top-10 left-1/2 w-px h-10 bg-[#6366F1] -translate-x-1/2" />
            
            {/* Corners */}
            <div onMouseDown={(e)=>handleResizeStart(e, 'nw')} className="absolute -top-2 -left-2 w-4 h-4 bg-white border border-[#6366F1] rounded-full pointer-events-auto cursor-nwse-resize z-50 hover:bg-[#6366F1]" />
            <div onMouseDown={(e)=>handleResizeStart(e, 'ne')} className="absolute -top-2 -right-2 w-4 h-4 bg-white border border-[#6366F1] rounded-full pointer-events-auto cursor-nesw-resize z-50 hover:bg-[#6366F1]" />
            <div onMouseDown={(e)=>handleResizeStart(e, 'sw')} className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border border-[#6366F1] rounded-full pointer-events-auto cursor-nesw-resize z-50 hover:bg-[#6366F1]" />
            <div onMouseDown={(e)=>handleResizeStart(e, 'se')} className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border border-[#6366F1] rounded-full pointer-events-auto cursor-nwse-resize z-50 hover:bg-[#6366F1]" />
            
            {/* Anchor Point Indicator */}
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#6366F1] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
