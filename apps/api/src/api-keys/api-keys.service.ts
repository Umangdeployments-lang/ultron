import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../engine/encryption.service";

export interface CreateApiKeyDto {
    name: string;
    provider: "gemini" | "openai" | "anthropic" | "custom";
    keyValue: string;
}

@Injectable()
export class ApiKeysService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService
    ) { }

    async list(tenantId: string) {
        return this.prisma.apiKey.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                provider: true,
                createdAt: true,
                updatedAt: true,
                // NEVER return keyCipher/keyIv/keyTag — secrets never leave the server
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async create(tenantId: string, dto: CreateApiKeyDto) {
        // Reject duplicate keys by hashing the key value
        const hash = this.encryption.hash(dto.keyValue.trim());
        const existing = await this.prisma.apiKey.findUnique({
            where: { keyHash: hash },
        });
        if (existing) {
            throw new Error("This API key has already been registered");
        }

        const encrypted = this.encryption.encrypt(dto.keyValue.trim());
        return this.prisma.apiKey.create({
            data: {
                tenantId,
                name: dto.name,
                provider: dto.provider,
                keyCipher: encrypted.cipher,
                keyIv: encrypted.iv,
                keyTag: encrypted.tag,
                keyHash: hash,
            },
            select: {
                id: true,
                name: true,
                provider: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(tenantId: string, id: string) {
        const key = await this.prisma.apiKey.findFirst({
            where: { id, tenantId },
        });
        if (!key) throw new NotFoundException("API key not found");
        await this.prisma.apiKey.delete({ where: { id } });
        return { ok: true };
    }

    /** Resolve a stored (decrypted) key for the runner. */
    async resolve(tenantId: string, id: string): Promise<string> {
        const key = await this.prisma.apiKey.findFirst({
            where: { id, tenantId },
        });
        if (!key) throw new NotFoundException("API key not found");
        return this.encryption.decrypt({
            cipher: key.keyCipher,
            iv: key.keyIv,
            tag: key.keyTag,
        });
    }
}
