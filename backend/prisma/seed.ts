// Seed demo users — run with: npx tsx prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ─── Org 1: Appinventiv (Super Admin) ───
  const appinventiv = await prisma.org.upsert({
    where: { id: 'org-appinventiv' },
    update: {},
    create: {
      id: 'org-appinventiv',
      name: 'Appinventiv',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'arjun@appinventiv.com' },
    update: {},
    create: {
      id: 'user-arjun',
      email: 'arjun@appinventiv.com',
      name: 'Arjun P',
      passwordHash: await bcrypt.hash('Admin@123', 12),
      role: 'ADMIN',
      orgId: appinventiv.id,
    },
  });

  // ─── Org 2: Hartwell & Associates (Law Firm) ───
  const hartwell = await prisma.org.upsert({
    where: { id: 'org-hartwell' },
    update: {},
    create: {
      id: 'org-hartwell',
      name: 'Hartwell & Associates',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'ryan@hartwell.com' },
    update: {},
    create: {
      id: 'user-ryan',
      email: 'ryan@hartwell.com',
      name: 'Ryan Melade',
      passwordHash: await bcrypt.hash('Law@2026', 12),
      role: 'ADMIN',
      orgId: hartwell.id,
    },
  });

  console.log('✅ Seeded demo users:');
  console.log('   Super Admin  → arjun@appinventiv.com / Admin@123');
  console.log('   Law Firm     → ryan@hartwell.com / Law@2026');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
