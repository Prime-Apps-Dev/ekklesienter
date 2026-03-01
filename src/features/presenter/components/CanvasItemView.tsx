import React, { useRef } from 'react';
import { useAtomValue } from 'jotai';
import { selectedCanvasItemIdsAtom, fontPreviewFamilyAtom, fontPreviewWeightAtom } from '@/core/store/uiAtoms';
import { ICanvasItem, IStyleLayer } from '@/core/types';
import { cn } from '@/core/utils/cn';
import { ensureLayers } from '@/core/utils/styleMigration';
import { needsFauxBold } from '@/core/services/fontService';
import { SlideBackground } from './SlideBackground';
import { useTextFit } from '../hooks/useTextFit';

import InlineTextEditor from './InlineTextEditor';

interface CanvasItemViewProps {
    item: ICanvasItem;
    isPreview?: boolean;
    isEditing?: boolean;
    onSave?: (id: string, content: string) => void;
    onInput?: (id: string, content: string) => void;
    onCancel?: () => void;
}

/**
 * Renders a single canvas item based on its type.
 * Used inside SlideCanvas and SlideContentRenderer.
 */
const CanvasItemView: React.FC<CanvasItemViewProps> = ({
    item,
    isPreview = false,
    isEditing = false,
    onSave = () => { },
    onInput = () => { },
    onCancel = () => { }
}) => {
    if (!item.visible) return null;

    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    // Preview font handling
    const selectedIds = useAtomValue(selectedCanvasItemIdsAtom);
    const previewFontFamily = useAtomValue(fontPreviewFamilyAtom);
    const previewFontWeight = useAtomValue(fontPreviewWeightAtom);
    const isSelected = selectedIds.includes(item.id);
    const rawFontFamily = (isSelected && previewFontFamily) ? previewFontFamily : (item.text?.fontFamily || 'Inter');

    // Formatting helper for robustness
    const activeFontFamily = React.useMemo(() => {
        if (!rawFontFamily) return 'Inter, sans-serif';
        const needsQuotes = rawFontFamily.includes(' ') && !rawFontFamily.includes(',') && !rawFontFamily.startsWith('"');
        const family = needsQuotes ? `"${rawFontFamily}"` : rawFontFamily;
        if (family.includes(',')) return family;

        // Add generic fallback based on some common patterns
        const lower = rawFontFamily.toLowerCase();
        if (lower.includes('serif')) return `${family}, serif`;
        if (lower.includes('mono')) return `${family}, monospace`;
        return `${family}, sans-serif`;
    }, [rawFontFamily]);

    const activeFontWeight = (isSelected && previewFontWeight) ? previewFontWeight : (item.text?.fontWeight || '400');

    const isText = item.type === 'text' && !!item.text;
    const isAutoWidthText = isText && item.text!.resizingMode === 'auto-width';
    const isAutoHeightText = isText && item.text!.resizingMode === 'auto-height';
    const isFlowText = isAutoWidthText || isAutoHeightText;
    const fittedFontSize = useTextFit({
        containerRef,
        textRef,
        resizingMode: isText ? item.text!.resizingMode || 'auto-height' : 'fixed',
        originalFontSize: isText ? item.text!.fontSize : 16,
        content: isText ? item.text!.content : '',
        fontFamily: activeFontFamily,
    });

    const renderContent = () => {
        switch (item.type) {
            case 'text':
                if (!item.text) return null;

                const fills = ensureLayers(item.text.textFills);
                const isRichTextFill = fills.length > 0 && (fills.length > 1 || fills[0].type !== 'color');
                const textFill = isRichTextFill ? fills : { type: 'color', color: item.text.color };
                const maskId = `text-mask-${item.id}`;

                const renderTextContent = () => {
                    const webkitStrokeStyle = item.strokes?.length > 0 && item.strokes[0].type === 'color' ? {
                        WebkitTextStroke: `${item.borderWidth || 0}px ${item.strokes[0].color}`,
                    } : {};

                    // Map alignHorizontal → textAlign CSS
                    const hAlign = item.text!.alignHorizontal || item.text!.textAlign || 'center';
                    const textAlignCss = hAlign === 'justify' ? 'justify' : hAlign;

                    // Map alignVertical → flexbox alignment
                    const vAlign = item.text!.alignVertical || 'middle';
                    const alignItemsCss = vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center';

                    // Map formatting flags → CSS
                    const fontStyleCss = item.text!.isItalic ? 'italic' : 'normal';
                    const isFauxBold = needsFauxBold(item.text!.isBold, activeFontWeight);
                    const textDecorationParts: string[] = [];
                    if (item.text!.isStrikethrough) textDecorationParts.push('line-through');
                    if (item.text!.isUnderline) textDecorationParts.push('underline');
                    const textDecorationLineCss = textDecorationParts.length > 0 ? textDecorationParts.join(' ') : 'none';
                    const textDecorationStyleCss = item.text!.underlineStyle === 'wavy' ? 'wavy' : 'solid';
                    const textDecorationSkipInkCss = item.text!.underlineSkipInk === 'none' ? 'none' : 'auto';
                    const textTransformCss = item.text!.textCase === 'uppercase' ? 'uppercase' : item.text!.textCase === 'lowercase' ? 'lowercase' : item.text!.textCase === 'titlecase' ? 'capitalize' : 'none';

                    // Letter spacing: numbers → px
                    const letterSpacingVal = typeof item.text!.letterSpacing === 'number' ? item.text!.letterSpacing
                        : parseFloat(item.text!.letterSpacing as string) || 0;

                    const commonTextStyle: React.CSSProperties = {
                        fontFamily: activeFontFamily,
                        fontSize: `${fittedFontSize}px`,
                        fontWeight: activeFontWeight,
                        lineHeight: item.text!.lineHeight || 1.3,
                        letterSpacing: letterSpacingVal !== 0 ? `${letterSpacingVal}px` : undefined,
                        fontStyle: fontStyleCss,
                        textDecorationLine: textDecorationLineCss,
                        textDecorationStyle: textDecorationStyleCss,
                        textDecorationSkipInk: textDecorationSkipInkCss,
                        textTransform: textTransformCss as React.CSSProperties['textTransform'],
                        textAlign: textAlignCss as React.CSSProperties['textAlign'],
                        whiteSpace: item.text!.resizingMode === 'auto-width' ? 'pre' : 'pre-wrap',
                        wordBreak: item.text!.resizingMode === 'auto-width' ? 'normal' : 'break-word',
                        ...webkitStrokeStyle,
                        // Faux bold: simulate bold via text-shadow (not WebkitTextStroke to avoid stroke conflict)
                        ...(isFauxBold ? {
                            textShadow: `0 0 ${Math.max(0.3, fittedFontSize * 0.015)}px currentColor`,
                            paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                        } : {}),
                        // Paragraph spacing
                        ...(item.text!.paragraphSpacing ? { paddingBottom: `${item.text!.paragraphSpacing}px` } : {}),
                    };

                    const containerOverflowX = 'visible'; // Never clip horizontally (let text wrap or overflow)
                    const containerOverflowY = 'visible'; // Never clip vertically (let text overflow bounds)

                    if (!isRichTextFill) {
                        return (
                            <div
                                ref={containerRef}
                                className={cn("flex flex-col relative", isFlowText ? (isAutoHeightText ? 'w-full' : '') : 'w-full h-full')}
                                style={{
                                    justifyContent: alignItemsCss,
                                    overflowX: containerOverflowX as React.CSSProperties['overflowX'],
                                    overflowY: containerOverflowY as React.CSSProperties['overflowY'],
                                    height: isFlowText ? undefined : '100%',
                                    opacity: isEditing ? 0 : 1, // Hide static text while editing to prevent ghosting
                                }}
                            >
                                <div
                                    className={cn(isAutoWidthText ? '' : 'w-full', '[&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside [&_ul]:pl-2 [&_ol]:pl-2')}
                                    style={{
                                        ...commonTextStyle,
                                        color: item.text!.color,
                                        overflow: 'visible', // Ensure no internal clipping
                                        ...(item.text!.scriptStyle === 'superscript' ? { verticalAlign: 'super', fontSize: `${fittedFontSize * 0.6}px` } : {}),
                                        ...(item.text!.scriptStyle === 'subscript' ? { verticalAlign: 'sub', fontSize: `${fittedFontSize * 0.6}px` } : {}),
                                    }}
                                    dangerouslySetInnerHTML={{ __html: item.text!.content }}
                                />
                            </div>
                        );
                    }

                    // Rich Text Fill (Gradient/Image/Video) using SVG Masking
                    return (
                        <div
                            ref={containerRef}
                            className={cn("relative flex", isFlowText ? (isAutoHeightText ? 'w-full' : '') : 'w-full h-full')}
                            style={{
                                alignItems: alignItemsCss,
                                justifyContent: textAlignCss === 'center' ? 'center' : textAlignCss === 'right' ? 'flex-end' : 'flex-start',
                                overflowX: containerOverflowX as React.CSSProperties['overflowX'],
                                overflowY: containerOverflowY as React.CSSProperties['overflowY'],
                                height: isFlowText ? undefined : '100%',
                                opacity: isEditing ? 0 : 1, // Hide static text while editing to prevent ghosting
                            }}
                        >
                            {/* Invisible text forces flex container to expand visually when using SVGs */}
                            <div
                                style={{
                                    ...commonTextStyle,
                                    color: 'transparent',
                                    visibility: 'hidden',
                                    pointerEvents: 'none',
                                    overflow: 'visible', // Ensure no internal clipping
                                    ...(item.text!.scriptStyle === 'superscript' ? { verticalAlign: 'super', fontSize: `${fittedFontSize * 0.6}px` } : {}),
                                    ...(item.text!.scriptStyle === 'subscript' ? { verticalAlign: 'sub', fontSize: `${fittedFontSize * 0.6}px` } : {}),
                                }}
                                dangerouslySetInnerHTML={{ __html: item.text!.content }}
                            />
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                                <defs>
                                    <mask id={maskId} maskUnits="userSpaceOnUse">
                                        <text
                                            ref={textRef as any}
                                            x={textAlignCss === 'center' ? '50%' : textAlignCss === 'right' ? '100%' : '0'}
                                            y={vAlign === 'top' ? '0' : vAlign === 'bottom' ? '100%' : '50%'}
                                            dominantBaseline={vAlign === 'top' ? 'hanging' : vAlign === 'bottom' ? 'text-after-edge' : 'middle'}
                                            textAnchor={textAlignCss === 'center' ? 'middle' : textAlignCss === 'right' ? 'end' : 'start'}
                                            style={{
                                                fontFamily: activeFontFamily,
                                                fontSize: `${fittedFontSize}px`,
                                                fontWeight: activeFontWeight,
                                                fontStyle: fontStyleCss,
                                                letterSpacing: letterSpacingVal !== 0 ? `${letterSpacingVal}px` : undefined,
                                                fill: 'white',
                                                WebkitTextStroke: item.strokes?.length > 0 ? `${item.borderWidth || 0}px white` : undefined,
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html:
                                                    item.text!.textCase === 'uppercase' ? item.text!.content.toUpperCase()
                                                        : item.text!.textCase === 'lowercase' ? item.text!.content.toLowerCase()
                                                            : item.text!.content
                                            }}
                                        />
                                    </mask>
                                </defs>
                            </svg>
                            <div className="w-full h-full" style={{ mask: `url(#${maskId})`, WebkitMask: `url(#${maskId})` }}>
                                <SlideBackground background={fills} showOverlay={false} />
                            </div>
                        </div>
                    );
                };

                return (
                    <div className={cn("relative", isFlowText ? (isAutoHeightText ? 'w-full' : '') : 'w-full h-full')}>
                        {renderTextContent()}
                        {isEditing && (
                            <div className="absolute inset-0 z-50">
                                <InlineTextEditor
                                    item={item}
                                    onSave={onSave}
                                    onInput={onInput}
                                    onCancel={onCancel}
                                />
                            </div>
                        )}
                    </div>
                );

            case 'image':
            case 'video':
            case 'shape':
                return <ShapeRenderer item={item} isPreview={isPreview} />;

            case 'stroke':
                if (!item.stroke) return null;
                return (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line
                            x1="0" y1="50"
                            x2={item.stroke.x2} y2={item.stroke.y2 === 0 ? 50 : item.stroke.y2}
                            stroke={item.stroke.color}
                            strokeWidth={item.stroke.width}
                            strokeDasharray={item.stroke.dashArray}
                        />
                    </svg>
                );

            case 'effect':
                if (!item.effect) return null;
                return <EffectRenderer effect={item.effect} />;

            default:
                return null;
        }
    };

    const align = item.strokeAlign || 'center';
    const borderWidth = item.borderWidth || 0;
    const strokes = ensureLayers(item.strokes);
    const fills = ensureLayers(item.fills);

    const getBorderRadius = () => {
        if (item.lockBorderRadius !== false) {
            return item.borderRadius ? `${item.borderRadius}px` : undefined;
        }
        return `${item.borderRadiusTL ?? 0}px ${item.borderRadiusTR ?? 0}px ${item.borderRadiusBR ?? 0}px ${item.borderRadiusBL ?? 0}px`;
    };

    const hasAnyRadius = () => {
        if (item.lockBorderRadius !== false) return (item.borderRadius || 0) > 0;
        return (item.borderRadiusTL || 0) > 0 || (item.borderRadiusTR || 0) > 0 ||
            (item.borderRadiusBR || 0) > 0 || (item.borderRadiusBL || 0) > 0;
    };

    return (
        <div
            className={cn(isFlowText ? (isAutoHeightText ? 'w-full relative' : 'relative') : 'w-full h-full relative')}
            style={{
                opacity: item.opacity ?? 1,
                filter: item.dropShadow ? `drop-shadow(${item.dropShadow.x}px ${item.dropShadow.y}px ${item.dropShadow.blur}px ${item.dropShadow.color})` : undefined,
            }}
        >
            {/* 1. Stroke Layer (If Outside) */}
            {borderWidth > 0 && align === 'outside' && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                    <StrokeRenderer item={item} strokes={strokes} align="outside" isPreview={isPreview} />
                </div>
            )}

            {/* 2. Main Element Container (Fill + Content) */}
            <div
                className={cn(isFlowText ? 'relative z-10' : 'absolute inset-0 z-10')}
                style={{
                    borderRadius: getBorderRadius(),
                    backdropFilter: item.backdropBlur ? `blur(${item.backdropBlur}px)` : undefined,
                    WebkitBackdropFilter: item.backdropBlur ? `blur(${item.backdropBlur}px)` : undefined,
                }}
            >
                {/* Fill Layer Stack */}
                {fills.length > 0 && (
                    <div className="absolute inset-0 z-0" style={{ borderRadius: getBorderRadius(), overflow: hasAnyRadius() ? 'hidden' : 'visible' }}>
                        <SlideBackground background={fills} showOverlay={false} />
                    </div>
                )}

                {/* Content Layer */}
                <div className={cn("relative z-10", isFlowText ? (isAutoHeightText ? 'w-full' : '') : 'w-full h-full')}>
                    {renderContent()}
                </div>

                {/* 3. Stroke Layer Stack (If Inside or Center) */}
                {borderWidth > 0 && (align === 'inside' || align === 'center') && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                        <StrokeRenderer item={item} strokes={strokes} align={align} isPreview={isPreview} />
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Sub-renderers ───────────────────────────────────────────

const StrokeRenderer: React.FC<{ item: ICanvasItem, strokes: IStyleLayer[], align: 'inside' | 'center' | 'outside', isPreview?: boolean }> = ({ item, strokes, align, isPreview }) => {
    const borderWidth = item.borderWidth || 0;
    const maskId = `stroke-mask-${item.id}`;

    // Helper for individual corners
    const getRadii = (offset = 0) => {
        if (item.lockBorderRadius !== false) {
            const r = (item.borderRadius || 0) + offset;
            return { tl: r, tr: r, br: r, bl: r };
        }
        return {
            tl: (item.borderRadiusTL || 0) + offset,
            tr: (item.borderRadiusTR || 0) + offset,
            br: (item.borderRadiusBR || 0) + offset,
            bl: (item.borderRadiusBL || 0) + offset,
        };
    };

    const radii = getRadii();
    const borderRadius = item.borderRadius || 0;

    // For "Outside" and "Center" we need to expand visually.
    const expansion = align === 'outside' ? borderWidth : align === 'center' ? borderWidth / 2 : 0;

    return (
        <div className="absolute overflow-visible pointer-events-none" style={{
            inset: -expansion,
            width: `calc(100% + ${expansion * 2}px)`,
            height: `calc(100% + ${expansion * 2}px)`,
        }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                    <mask id={maskId} maskUnits="userSpaceOnUse">
                        {item.type === 'shape' ? (
                            <g transform={`scale(${1 + (expansion * 2) / 100}, ${1 + (expansion * 2) / 100}) translate(${-expansion}, ${-expansion})`}>
                                <ShapeMaskContent item={item} isBorder={true} align={align} />
                            </g>
                        ) : (
                            <g>
                                {align === 'outside' ? (
                                    <>
                                        <RoundedRect x={0} y={0} width="100%" height="100%" radii={getRadii(expansion)} fill="white" />
                                        <RoundedRect x={expansion} y={expansion} width={`calc(100% - ${expansion * 2}px)`} height={`calc(100% - ${expansion * 2}px)`} radii={radii} fill="black" />
                                    </>
                                ) : align === 'inside' ? (
                                    <>
                                        <RoundedRect x={0} y={0} width="100%" height="100%" radii={radii} fill="white" />
                                        <RoundedRect x={borderWidth} y={borderWidth} width={`calc(100% - ${borderWidth * 2}px)`} height={`calc(100% - ${borderWidth * 2}px)`} radii={getRadii(-borderWidth)} fill="black" />
                                    </>
                                ) : (
                                    /* Center */
                                    <RoundedRect
                                        x={expansion} y={expansion}
                                        width={`calc(100% - ${expansion * 2}px)`} height={`calc(100% - ${expansion * 2}px)`}
                                        radii={radii} fill="none" stroke="white" strokeWidth={borderWidth}
                                    />
                                )}
                            </g>
                        )}
                    </mask>
                </defs>
            </svg>
            <div
                className="absolute inset-0"
                style={{
                    mask: `url(#${maskId})`,
                    WebkitMask: `url(#${maskId})`,
                }}
            >
                <SlideBackground background={strokes} showOverlay={false} />
            </div>
        </div>
    );
};

const ShapeMaskContent: React.FC<{ item: ICanvasItem, isBorder: boolean, align: 'inside' | 'center' | 'outside' }> = ({ item, isBorder, align }) => {
    const shape = item.shape || { shapeType: 'rect' };
    const strokeWidth = item.borderWidth || 0;

    // In SVG mask, white = visible, black = transparent.
    const effectiveWidth = (align === 'inside' || align === 'outside') ? strokeWidth * 2 : strokeWidth;

    const strokeProps = {
        fill: 'none',
        stroke: 'white',
        strokeWidth: effectiveWidth,
        strokeLinejoin: "round" as const,
        vectorEffect: "non-scaling-stroke" as const
    };

    const fillProps = {
        fill: 'white',
        stroke: 'none',
        vectorEffect: "non-scaling-stroke" as const
    };

    const renderPaths = () => {
        const getRadii = () => {
            if (item.lockBorderRadius !== false) {
                const r = item.borderRadius || 0;
                return { tl: r, tr: r, br: r, bl: r };
            }
            return {
                tl: item.borderRadiusTL || 0,
                tr: item.borderRadiusTR || 0,
                br: item.borderRadiusBR || 0,
                bl: item.borderRadiusBL || 0,
            };
        };

        const getShape = (props: any) => {
            switch (shape.shapeType) {
                case 'circle': return <circle cx="50" cy="50" r="48" {...props} />;
                case 'triangle': return <polygon points="50,2 98,98 2,98" {...props} />;
                case 'star': return <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" {...props} />;
                case 'diamond': return <polygon points="50,2 98,50 50,98 2,50" {...props} />;
                case 'rect':
                default: return <RoundedRect x={1} y={1} width={98} height={98} radii={getRadii()} {...props} />;
            }
        };

        if (align === 'outside') {
            // Outside: Draw white stroke, then black-out the fill area
            return (
                <>
                    {getShape(strokeProps)}
                    {getShape({ ...fillProps, fill: 'black' })}
                </>
            );
        } else if (align === 'inside') {
            // Inside: Draw white fill area, then black-out the center
            // (Alternatively, draw stroke and clip to fill - but we're in a mask already)
            // Easier: white stroke, clip to shape fill.
            return (
                <g style={{ clipPath: `url(#clip-${item.id})` }}>
                    {getShape(strokeProps)}
                </g>
            );
        } else {
            // Center
            return getShape(strokeProps);
        }
    };

    return (
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            {renderPaths()}
        </svg>
    );
};

const ShapeRenderer: React.FC<{ item: ICanvasItem, isPreview?: boolean }> = ({ item, isPreview }) => {
    const shape = item.shape || { shapeType: 'rect' };
    const clipId = `clip-${item.id}`;

    const getSVGPath = () => {
        const getRadii = () => {
            if (item.lockBorderRadius !== false) {
                const r = item.borderRadius || 0;
                return { tl: r, tr: r, br: r, bl: r };
            }
            return {
                tl: item.borderRadiusTL || 0,
                tr: item.borderRadiusTR || 0,
                br: item.borderRadiusBR || 0,
                bl: item.borderRadiusBL || 0,
            };
        };

        switch (shape.shapeType) {
            case 'circle': return <circle cx="50" cy="50" r="48" />;
            case 'triangle': return <polygon points="50,2 98,98 2,98" />;
            case 'star': return <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" />;
            case 'diamond': return <polygon points="50,2 98,50 50,98 2,50" />;
            case 'rect':
            default: return <RoundedRect x={0} y={0} width={100} height={100} radii={getRadii()} />;
        }
    };

    return (
        <div className="w-full h-full relative" style={{ clipPath: `url(#${clipId})`, WebkitClipPath: `url(#${clipId})` }}>
            <svg className="absolute inset-0 w-0 h-0 pointer-events-none">
                <defs>
                    <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                        <g transform="scale(0.01, 0.01)">
                            {getSVGPath()}
                        </g>
                    </clipPath>
                </defs>
            </svg>
        </div>
    );
};

// ─── SVG Rounded Rect Helper ────────────────────────────────

const RoundedRect: React.FC<{
    x: number | string,
    y: number | string,
    width: number | string,
    height: number | string,
    radii: { tl: number, tr: number, br: number, bl: number },
    [key: string]: any
}> = ({ x, y, width, height, radii, ...props }) => {
    const rx = typeof x === 'number' ? x : 0;
    const ry = typeof y === 'number' ? y : 0;
    const rw = typeof width === 'number' ? width : 100;
    const rh = typeof height === 'number' ? height : 100;

    // Use standard rect if all corners are same
    if (radii.tl === radii.tr && radii.tr === radii.br && radii.br === radii.bl) {
        return <rect x={x} y={y} width={width} height={height} rx={radii.tl} {...props} />;
    }

    // Otherwise use a path
    const { tl, tr, br, bl } = radii;
    // Basic path for individual corners
    const path = `
        M ${rx + tl},${ry}
        h ${rw - tl - tr}
        a ${tr},${tr} 0 0 1 ${tr},${tr}
        v ${rh - tr - br}
        a ${br},${br} 0 0 1 -${br},${br}
        h -${rw - br - bl}
        a ${bl},${bl} 0 0 1 -${bl},-${bl}
        v -${rh - bl - tl}
        a ${tl},${tl} 0 0 1 ${tl},-${tl}
        z
    `;

    return <path d={path} {...props} />;
};

const EffectRenderer: React.FC<{ effect: NonNullable<ICanvasItem['effect']> }> = ({ effect }) => {
    switch (effect.effectType) {
        case 'glow':
            return <div className="w-full h-full rounded-full" style={{ background: `radial-gradient(circle, ${effect.color} 0%, transparent 70%)` }} />;
        case 'shadow':
            return <div className="w-full h-full rounded-2xl" style={{ boxShadow: `0 0 ${effect.intensity}px ${effect.color}` }} />;
        case 'blur':
            return <div className="w-full h-full" style={{ backdropFilter: `blur(${effect.intensity / 5}px)`, background: effect.color }} />;
        case 'vignette':
            return <div className="w-full h-full" style={{ background: `radial-gradient(ellipse, transparent 40%, ${effect.color} 100%)` }} />;
        default:
            return null;
    }
};

export default CanvasItemView;
