import Encoding from 'encoding-japanese';

export function readUnicodeText(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result as any);

            try {
                let rawResult = '';
                const bytes = new Uint8Array(data);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    rawResult += String.fromCharCode(bytes[i]);
                }

                resolve(rawResult);
            } catch (e) {
                reject(e);
            }
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
    });
}

export function readTextUsingEncodingLibrary(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result as any);
            const detectedEncoding = Encoding.detect(data);
            if (!detectedEncoding)
                throw new Error("Couldn't detect encoding");

            try {
                const unicodeString = Encoding.convert(data, {
                    to: 'UNICODE',
                    from: detectedEncoding,
                    type: 'string'
                });

                resolve(unicodeString);
            } catch (e) {
                reject(e);
            }
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
    });
}
