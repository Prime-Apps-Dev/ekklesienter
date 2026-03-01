/**
 * Converts Gain (linear 0-1+) to Decibels (dB)
 * 0 dB = 1.0 gain
 * Gain 2.0 = +6.02 dB
 */
export const gainToDb = (gain: number): string => {
    if (gain <= 0) return '-∞';
    const db = 20 * Math.log10(gain);
    return (db > 0 ? '+' : '') + db.toFixed(1);
};

/**
 * Converts Decibels (dB) to Gain (linear)
 * 0 dB = 1.0 gain
 */
export const dbToGain = (db: number): number => {
    return Math.pow(10, db / 20);
};
/**
 * Extracts peaks from an AudioBuffer to be used for waveform visualization.
 * It combines channels and returns an array of normalized peaks (0 to 1).
 */
export const generateWaveformPoints = (buffer: AudioBuffer, samples: number): number[] => {
    const { duration, numberOfChannels, sampleRate } = buffer;
    const channelData = [];

    // Get data for all channels
    for (let i = 0; i < numberOfChannels; i++) {
        channelData.push(buffer.getChannelData(i));
    }

    const points: number[] = [];
    const blockSize = Math.floor(buffer.length / samples);

    for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        let max = 0;

        // Find maximum peak in this block across all channels
        for (let c = 0; c < numberOfChannels; c++) {
            const data = channelData[c];
            for (let j = 0; j < blockSize; j++) {
                const val = Math.abs(data[start + j]);
                if (val > max) max = val;
            }
        }
        points.push(max);
    }

    return points;
};
