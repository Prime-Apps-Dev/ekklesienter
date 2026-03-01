import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/core/utils/cn';

interface CustomColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
    className?: string;
}

// Helper to convert hex to hsv
const hexToHsv = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }

    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

// Helper to convert hsv to hex
const hsvToHex = (h: number, s: number, v: number) => {
    h /= 360; s /= 100; v /= 100;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    const toHex = (n: number) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const PRESET_COLORS = [
    '#FFFFFF', '#A8A29E', '#44403C', '#000000',
    '#F87171', '#FB923C', '#FBBF24', '#34D399',
    '#60A5FA', '#818CF8', '#A78BFA', '#F472B6'
];

export const CustomColorPicker: React.FC<CustomColorPickerProps> = ({
    color,
    onChange,
    label,
    className
}) => {
    const [hsv, setHsv] = useState(hexToHsv(color || '#FFFFFF'));
    const [isPickingSaturation, setIsPickingSaturation] = useState(false);
    const [isPickingHue, setIsPickingHue] = useState(false);

    const saturationRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);

    // Sync state with prop
    useEffect(() => {
        const newHsv = hexToHsv(color || '#FFFFFF');
        // Only update if hex is different (to avoid jitter during interaction)
        if (hsvToHex(hsv.h, hsv.s, hsv.v) !== color.toUpperCase()) {
            setHsv(newHsv);
        }
    }, [color]);

    const updateColor = useCallback((newHsv: { h: number, s: number, v: number }) => {
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    }, [onChange]);

    const handleSaturationPointerDown = (e: React.PointerEvent) => {
        setIsPickingSaturation(true);
        handleSaturationMove(e);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleSaturationMove = (e: React.PointerEvent | MouseEvent) => {
        if (!saturationRef.current) return;
        const rect = saturationRef.current.getBoundingClientRect();
        const s = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const v = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
        updateColor({ ...hsv, s, v });
    };

    const handleHuePointerDown = (e: React.PointerEvent) => {
        setIsPickingHue(true);
        handleHueMove(e);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleHueMove = (e: PointerEvent | React.PointerEvent) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
        updateColor({ ...hsv, h });
    };

    useEffect(() => {
        if (!isPickingSaturation) return;
        const onMove = (e: PointerEvent) => handleSaturationMove(e);
        const onUp = () => setIsPickingSaturation(false);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [isPickingSaturation, hsv, updateColor]);

    useEffect(() => {
        if (!isPickingHue) return;
        const onMove = (e: PointerEvent) => handleHueMove(e);
        const onUp = () => setIsPickingHue(false);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [isPickingHue, hsv, updateColor]);

    return (
        <div className={cn("space-y-4", className)}>
            {label && (
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{label}</label>
                    <span className="text-xs font-mono text-accent">{color.toUpperCase()}</span>
                </div>
            )}

            <div className="bg-black/40 rounded-2xl p-3 border border-white/5 space-y-4 shadow-xl">
                {/* Saturation & Value Picker */}
                <div
                    ref={saturationRef}
                    className="relative w-full aspect-square rounded-xl overflow-hidden cursor-crosshair select-none"
                    style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
                    onPointerDown={handleSaturationPointerDown}
                >
                    <div className="absolute inset-0 bg-linear-to-r from-white to-transparent" />
                    <div className="absolute inset-0 bg-linear-to-b from-transparent to-black" />

                    {/* Handle */}
                    <div
                        className="absolute w-4 h-4 border-2 border-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] -translate-x-1/2 translate-y-1/2 pointer-events-none transition-transform duration-75 active:scale-125"
                        style={{
                            left: `${hsv.s}%`,
                            bottom: `${hsv.v}%`
                        }}
                    />
                </div>

                {/* Hue Slider */}
                <div className="space-y-2">
                    <div
                        ref={hueRef}
                        className="relative h-6 w-full rounded-lg cursor-pointer select-none overflow-hidden"
                        style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                        onPointerDown={handleHuePointerDown}
                    >
                        {/* Hue Handle */}
                        <div
                            className="absolute inset-y-0 w-2 bg-white border border-black/20 rounded-md shadow-md -translate-x-1/2 pointer-events-none transition-all duration-75"
                            style={{ left: `${(hsv.h / 360) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Inputs & Presets */}
                <div className="space-y-3">
                    <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map((p) => (
                            <button
                                key={p}
                                onClick={() => onChange(p)}
                                className={cn(
                                    "aspect-square rounded-lg border-2 transition-all hover:scale-110 active:scale-95",
                                    color.toUpperCase() === p ? "border-accent scale-110" : "border-white/5"
                                )}
                                style={{ backgroundColor: p }}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={color.toUpperCase()}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^#[0-9A-F]{0,6}$/i.test(val)) {
                                        onChange(val);
                                    }
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono text-stone-300 focus:outline-none focus:border-accent/50"
                                placeholder="#FFFFFF"
                            />
                        </div>
                        <div
                            className="w-10 h-10 rounded-xl border border-white/10 shadow-inner"
                            style={{ backgroundColor: color }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
