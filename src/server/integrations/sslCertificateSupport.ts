import { createCert } from "mkcert";
import { readFile } from "fs-extra";
import { networkInterfaces } from "os";

export async function loadSSLCertificate(certPath: string, keyPath: string) {
    return {
        cert: await readFile(certPath, "utf-8"),
        key: await readFile(keyPath, "utf-8")
    };
}

export async function generateSSLCertificate(rootCertPath: string, rootKeyPath: string, domains: string[]) {
    const ca = await loadSSLCertificate(rootCertPath, rootKeyPath);
    return await createCert({
        domains,
        validityDays: 365,
        caKey: ca.key,
        caCert: ca.cert
    });
}

export function getLocalIPAdresses(includeInternal: boolean): string[] {
    const nets = networkInterfaces();
    const results = new Set<string>();

    if (includeInternal) {
        results.add("localhost");
        results.add("127.0.0.1");
    }

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
            if ((net.family === familyV4Value) && !net.internal) {
                results.add(net.address);
            }
        }
    }

    return Array.from(results);
}