import 'dotenv/config'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma'

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

export const db = new PrismaClient({ adapter })