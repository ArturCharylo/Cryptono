import init, { perform_local_audit } from '../wasm/cryptono_audit';
import { VaultRepository } from '../repositories/VaultRepository';

async function runAudit(data: Uint8Array) {
    await init();
    const result = perform_local_audit(JSON.stringify(data));
    return JSON.parse(result);
}

export class AuditService {
    private vaultRepository: VaultRepository;

    constructor(vaultRepository: VaultRepository) {
        this.vaultRepository = vaultRepository;
    }

    async results() {
        const vault = this.vaultRepository.getAllItems();
        return runAudit(vault as unknown as Uint8Array);
    }
}