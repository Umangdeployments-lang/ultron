import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "crypto";

export interface EncryptedPayload {
    cipher: string;
    iv: string;
    tag: string;
}

/**
 * AES-256-GCM encryption for tenant BYOK API keys.
 * Uses a hex-encoded 32-byte key from ENCRYPTION_KEY (dev) —
 * in production, integrate with a proper KMS.
 */
@Injectable()
export class EncryptionService {
    constructor(private readonly config: ConfigService) { }

    private get key(): Buffer {
        const keyHex =
            this.config.get<string>("ENCRYPTION_KEY") ??
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        return Buffer.from(keyHex, "hex");
    }

    encrypt(plain: string): EncryptedPayload {
        const iv = randomBytes(12);
        const cipher = createCipheriv("aes-256-gcm", this.key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plain, "utf8"),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return {
            cipher: encrypted.toString("base64"),
            iv: iv.toString("base64"),
            tag: tag.toString("base64"),
        };
    }

    decrypt(payload: EncryptedPayload): string {
        const decipher = createDecipheriv(
            "aes-256-gcm",
            this.key,
            Buffer.from(payload.iv, "base64")
        );
        decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(payload.cipher, "base64")),
            decipher.final(),
        ]);
        return decrypted.toString("utf8");
    }

    /** Deterministic SHA-256 hash used for uniqueness + lookup. */
    hash(value: string): string {
        return createHash("sha256").update(value).digest("hex");
    }
}
