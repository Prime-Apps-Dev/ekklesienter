import React from 'react';
import { PresenterSettings } from '@/core/types';
import { cn } from '@/core/utils/cn';

interface SlideBackgroundProps {
    settings: PresenterSettings;
    className?: string;
}

export const SlideBackground: React.FC<SlideBackgroundProps> = ({ settings, className }) => {
    const { background } = settings;

    const renderBackground = () => {
        switch (background.type) {
            case 'color':
                return <div className="absolute inset-0" style={{ backgroundColor: background.color }} />;
            case 'gradient':
                return (
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(${background.gradient?.angle}deg, ${background.gradient?.from}, ${background.gradient?.to})`
                        }}
                    />
                );
            case 'image':
                return (
                    <div className="absolute inset-0 overflow-hidden">
                        <img
                            src={background.image?.url}
                            className="w-full h-full object-cover transition-transform duration-500"
                            alt=""
                            style={{
                                filter: `blur(${background.blur || 0}px)`,
                                transform: background.blur && background.blur > 0 ? 'scale(1.05)' : 'scale(1)'
                            }}
                        />
                        <div className="absolute inset-0 bg-black/40" />
                    </div>
                );
            case 'video':
                if (background.video?.source === 'youtube') {
                    return (
                        <div className="absolute inset-0 overflow-hidden">
                            <iframe
                                src={`https://www.youtube.com/embed/${background.video?.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${background.video?.id}&rel=0&showinfo=0`}
                                className="w-[300%] h-[300%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                allow="autoplay; encrypted-media"
                                style={{
                                    filter: `blur(${background.blur || 0}px)`,
                                    transform: background.blur && background.blur > 0 ? 'translate(-50%, -50%) scale(1.05)' : 'translate(-50%, -50%) scale(1)'
                                }}
                            />
                            <div className="absolute inset-0 bg-black/40" />
                        </div>
                    );
                }
                return (
                    <div className="absolute inset-0 overflow-hidden">
                        <video
                            src={background.video?.url}
                            autoPlay
                            muted={background.video?.isMuted}
                            loop={background.video?.isLooping}
                            className="w-full h-full object-cover transition-transform duration-500"
                            style={{
                                filter: `blur(${background.blur || 0}px)`,
                                transform: background.blur && background.blur > 0 ? 'scale(1.05)' : 'scale(1)'
                            }}
                        />
                        <div className="absolute inset-0 bg-black/40" />
                    </div>
                );
            default:
                return <div className="absolute inset-0 bg-black" />;
        }
    };

    return (
        <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
            {renderBackground()}
        </div>
    );
};
