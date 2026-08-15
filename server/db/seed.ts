/**
 * Mengisi tabel katalog (`skills`, `roles`, `gigs`, dan relasinya) dari
 * `catalog-seed.ts` dan `gig-seed.ts` menggunakan Prisma Client.
 *
 *   npm run db:seed
 *
 * Memakai upsert, jadi aman dijalankan ulang: baris yang sudah ada diperbarui,
 * bukan diduplikasi.
 */

import { PrismaClient } from '@prisma/client'
import { ROLE_SEED, SKILL_SEED } from './catalog-seed'
import { GIG_SEED } from './gig-seed'

const prisma = new PrismaClient()

async function main() {
  // ── Keterampilan ──────────────────────────────────────────────────────────
  for (const [index, skill] of SKILL_SEED.entries()) {
    await prisma.skill.upsert({
      where: { id: skill.id },
      create: {
        id: skill.id,
        label: skill.label,
        category: skill.category,
        sortOrder: index,
      },
      update: {
        label: skill.label,
        category: skill.category,
        sortOrder: index,
      },
    })

    // Alias ditulis ulang seluruhnya supaya alias yang dihapus dari benih
    // ikut hilang dari database.
    await prisma.skillAlias.deleteMany({ where: { skillId: skill.id } })
    if (skill.aliases.length > 0) {
      await prisma.skillAlias.createMany({
        data: skill.aliases.map((alias) => ({
          skillId: skill.id,
          alias: alias.toLowerCase(),
        })),
        skipDuplicates: true,
      })
    }
  }
  console.log(`✓ ${SKILL_SEED.length} keterampilan`)

  // ── Peran kerja ───────────────────────────────────────────────────────────
  for (const [index, role] of ROLE_SEED.entries()) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        title: role.title,
        field: role.field,
        salaryMin: role.salaryMin,
        salaryTypical: role.salaryTypical,
        entryFriendly: role.entryFriendly,
        remoteFriendly: role.remoteFriendly,
        timeToEntry: role.timeToEntry,
        description: role.description,
        searchQuery: role.searchQuery,
        sortOrder: index,
      },
      update: {
        title: role.title,
        field: role.field,
        salaryMin: role.salaryMin,
        salaryTypical: role.salaryTypical,
        entryFriendly: role.entryFriendly,
        remoteFriendly: role.remoteFriendly,
        timeToEntry: role.timeToEntry,
        description: role.description,
        searchQuery: role.searchQuery,
        sortOrder: index,
      },
    })

    // Relasi skills ditulis ulang seluruhnya
    await prisma.roleSkill.deleteMany({ where: { roleId: role.id } })
    for (const [order, skillId] of role.skills.entries()) {
      await prisma.roleSkill.upsert({
        where: { roleId_skillId: { roleId: role.id, skillId } },
        create: { roleId: role.id, skillId, sortOrder: order },
        update: { sortOrder: order },
      })
    }
  }
  console.log(`✓ ${ROLE_SEED.length} peran kerja`)

  // ── Micro-gig ─────────────────────────────────────────────────────────────
  for (const [index, gig] of GIG_SEED.entries()) {
    await prisma.gig.upsert({
      where: { id: gig.id },
      create: {
        id: gig.id,
        title: gig.title,
        category: gig.category,
        earnMin: gig.earnMin,
        earnMax: gig.earnMax,
        unit: gig.unit,
        hoursPerUnit: gig.hoursPerUnit,
        maxUnitsPerWeek: gig.maxUnitsPerWeek,
        daysToFirstPay: gig.daysToFirstPay,
        startupCost: gig.startupCost,
        remoteFriendly: gig.remoteFriendly,
        description: gig.description,
        howToStart: gig.howToStart,
        caution: gig.caution,
        sortOrder: index,
      },
      update: {
        title: gig.title,
        category: gig.category,
        earnMin: gig.earnMin,
        earnMax: gig.earnMax,
        unit: gig.unit,
        hoursPerUnit: gig.hoursPerUnit,
        maxUnitsPerWeek: gig.maxUnitsPerWeek,
        daysToFirstPay: gig.daysToFirstPay,
        startupCost: gig.startupCost,
        remoteFriendly: gig.remoteFriendly,
        description: gig.description,
        howToStart: gig.howToStart,
        caution: gig.caution,
        sortOrder: index,
      },
    })

    // Skills & channels ditulis ulang seluruhnya
    await prisma.gigSkill.deleteMany({ where: { gigId: gig.id } })
    for (const [order, skillId] of gig.skills.entries()) {
      await prisma.gigSkill.upsert({
        where: { gigId_skillId: { gigId: gig.id, skillId } },
        create: { gigId: gig.id, skillId, sortOrder: order },
        update: { sortOrder: order },
      })
    }

    await prisma.gigChannel.deleteMany({ where: { gigId: gig.id } })
    for (const [order, channel] of gig.channels.entries()) {
      await prisma.gigChannel.create({
        data: {
          gigId: gig.id,
          name: channel.name,
          searchQuery: channel.searchQuery,
          kind: channel.kind,
          sortOrder: order,
        },
      })
    }
  }
  console.log(`✓ ${GIG_SEED.length} micro-gig`)

  console.log('\nKatalog siap. Jalankan `npm run dev` lalu buka /skill-gap.')
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error('\n✗ Seed gagal:', message)

    if (message.includes("Can't reach database") || message.includes('ECONNREFUSED')) {
      console.error(
        '\n  Database tidak bisa dihubungi.\n' +
          '  Pastikan DATABASE_URL di file .env sudah benar dan TiDB Cloud / MySQL berjalan.',
      )
    } else if (message.includes("doesn't exist") || message.includes('does not exist')) {
      console.error('\n  Tabelnya belum dibuat. Jalankan dulu: npm run db:push')
    }

    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
