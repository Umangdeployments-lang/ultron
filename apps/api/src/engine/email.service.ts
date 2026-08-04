import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SendEmailInput {
    to: string;
    subject: string;
    body: string;
}

/** Sends email via Resend if configured, else SMTP, else dev-log. */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    constructor(private readonly config: ConfigService) { }

    async send(input: SendEmailInput): Promise<{ provider: string; id?: string }> {
        const key = this.config.get("RESEND_API_KEY");
        if (key) {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    from: this.config.get("SMTP_FROM") ?? "ultron <no-reply@ultron.local>",
                    to: input.to,
                    subject: input.subject,
                    text: input.body,
                }),
            });
            if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { provider: "resend", id: data?.id };
        }
        if (this.config.get("SMTP_HOST")) {
            const nodemailer = require("nodemailer");
            const transporter = nodemailer.createTransport({
                host: this.config.get("SMTP_HOST"),
                port: parseInt(this.config.get("SMTP_PORT", "587"), 10),
                secure: false,
                auth: { user: this.config.get("SMTP_USER"), pass: this.config.get("SMTP_PASS") },
            });
            const info = await transporter.sendMail({
                from: this.config.get("SMTP_FROM"),
                to: input.to,
                subject: input.subject,
                text: input.body,
            });
            return { provider: "smtp", id: info?.messageId };
        }
        this.logger.warn(`[DEV] Email not sent. to=${input.to} subject=${input.subject}`);
        return { provider: "dev-log" };
    }
}
