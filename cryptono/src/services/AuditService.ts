import init, { perform_local_audit } from '../wasm/cryptono_audit';

export async function runAudit(data: Uint8Array) {
    await init();
    const result = perform_local_audit(JSON.stringify(data));
    return JSON.parse(result);
}