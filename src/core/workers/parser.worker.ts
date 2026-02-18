import { BibleData } from '@/core/types';
import { zefaniaParser } from '@/core/parsers/zefaniaParser';
import { myBibleParser } from '@/core/parsers/myBibleParser';

/* eslint-disable no-restricted-globals */
self.onmessage = async (e: MessageEvent) => {
    const { fileType, content, fileName } = e.data;

    try {
        let data: BibleData;

        if (fileType === 'xml') {
            data = await zefaniaParser.parse(content as string, fileName);
        } else if (fileType === 'sqlite') {
            data = await myBibleParser.parse(content as ArrayBuffer, fileName);
        } else {
            throw new Error(`Unsupported file type: ${fileType}`);
        }

        self.postMessage({ type: 'success', data });
    } catch (err) {
        self.postMessage({
            type: 'error',
            error: err instanceof Error ? err.message : 'Unknown Parsing Error'
        });
    }
};
