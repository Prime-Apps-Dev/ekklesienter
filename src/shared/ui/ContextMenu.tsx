import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/core/utils/cn';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Slight delay to avoid immediate close from the triggering click
        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Ensure menu stays within screen bounds
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const menuWidth = 220; // assumed max width
    const menuHeight = 200; // assumed max height

    const finalX = x + menuWidth > screenWidth ? screenWidth - menuWidth - 10 : x;
    const finalY = y + menuHeight > screenHeight ? screenHeight - menuHeight - 10 : y;

    return createPortal(
        <div
            ref={menuRef}
            className={cn(
                "fixed z-100 min-w-[200px] bg-stone-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden",
                "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
            )}
            style={{ top: finalY, left: finalX }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
                {children}
            </div>
        </div>,
        document.body
    );
};

export const ContextMenuItem: React.FC<{
    icon?: React.ReactNode;
    label: string;
    onClick: () => void;
    shortcut?: string;
    danger?: boolean;
}> = ({ icon, label, onClick, shortcut, danger }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className={cn(
            "group w-full text-left px-4 py-2.5 text-xs font-bold transition-all duration-200 flex items-center gap-3 relative overflow-hidden",
            danger
                ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                : "text-stone-300 hover:bg-accent/10 hover:text-accent"
        )}
    >
        {/* Hover Indicator */}
        {!danger && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent rounded-r-full scale-y-0 group-hover:scale-y-100 transition-transform duration-200" />
        )}

        {icon && (
            <span className={cn(
                "w-4 h-4 transition-transform duration-200 group-hover:scale-110",
                danger ? "text-red-400 opacity-80" : "text-stone-500 group-hover:text-accent"
            )}>
                {icon}
            </span>
        )}
        <span className="flex-1 tracking-wide">{label}</span>
        {shortcut && (
            <span className="text-[9px] font-black text-stone-600 uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded-md group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                {shortcut}
            </span>
        )}
    </button>
);

export default ContextMenu;
