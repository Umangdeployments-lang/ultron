/**
 * Production seed — creates the default tenant + admin user.
 * In Phase 1 there is no auth, and the frontend uses `tenant_local`.
 * This ensures a fresh production database has the required tenant row.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const tenantId = "tenant_local";

    const tenant = await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: {
            id: tenantId,
            name: "Local / Default Tenant",
            slug: "tenant_local",
            plan: "free",
        },
    });
    console.log(`✅ Tenant ready: ${tenant.id} (${tenant.slug})`);

    // Seed admin user (passwordHash omitted — Phase 1 has no auth)
    await prisma.user.upsert({
        where: { email: "admin@ultron.local" },
        update: {},
        create: {
            email: "admin@ultron.local",
            name: "Admin",
            role: "owner",
            tenantId,
        },
    });
    console.log("✅ Admin user ready: admin@ultron.local");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });