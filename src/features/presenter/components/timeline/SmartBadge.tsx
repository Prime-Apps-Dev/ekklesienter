import React from 'react';
import { useTranslation } from 'react-i18next';
import { ISlide } from '@/core/types';
import { Timer, ArrowRightLeft } from 'lucide-react';

interface SmartBadgeProps {
    slide: ISlide;
}

/**
 * Renders badges for overridden slide properties such as duration (auto-advance)
 * and custom transitions.
 */
const SmartBadge: React.FC<SmartBadgeProps> = ({ slide }) => {
    const { t } = useTranslation();

    const hasDuration = slide.duration !== undefined && slide.duration > 0;
    const hasTransition = slide.transition !== undefined && slide.transition !== 'none';

    if (!hasDuration && !hasTransition) return null;

    return (
        <div className="absolute top-1 left-7 flex gap-1 animate-in fade-in duration-200">
            {hasDuration && (
                <div
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 backdrop-blur-md text-[8px] font-black text-blue-300"
                    title={t('auto_advance_timer', 'Auto-advance timer')}
                >
                    <Timer className="w-2.5 h-2.5" />
                    {slide.duration}s
                </div>
            )}

            {hasTransition && (
                <div
                    className="flex items-center justify-center w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30 backdrop-blur-md text-purple-300"
                    title={t('custom_transition', 'Custom transition')}
                >
                    <ArrowRightLeft className="w-2.5 h-2.5" />
                </div>
            )}
        </div>
    );
};

export default React.memo(SmartBadge);
