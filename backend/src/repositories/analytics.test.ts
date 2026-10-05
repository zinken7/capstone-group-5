import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { findBreakdowns } = await import('./analytics.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

describe('findBreakdowns', () => {
  it('counts machines in verified deployments by each dimension', async () => {
    const result = await findBreakdowns({})

    // Deployments 10 (96), 11 (5) and 14 (20); 12 is pending_review
    expect(result.machineCount).toBe(121)
    expect(result.byCountry).toEqual([{ key: 'AU', machineCount: 121, share: 1 }])
    expect(result.byMachineType).toEqual([
      { key: 'haul_truck', machineCount: 116, share: 116 / 121 },
      { key: 'drill', machineCount: 5, share: 5 / 121 },
    ])
    expect(result.byManufacturer).toEqual([
      { key: 'Caterpillar', machineCount: 116, share: 116 / 121 },
      { key: 'Sandvik', machineCount: 5, share: 5 / 121 },
    ])
    expect(result.bySupplier).toEqual([
      { key: 'Caterpillar', machineCount: 116, share: 116 / 121 },
      { key: 'RCT', machineCount: 5, share: 5 / 121 },
    ])
  })

  it('lists every automation level in order and keeps unclassified machines separate', async () => {
    const result = await findBreakdowns({})

    // Deployment 14's product has no level, so its 20 machines are unclassified
    expect(result.byAutomationLevel).toEqual([
      { key: 'operator_assistance', machineCount: 0, share: 0 },
      { key: 'teleremote', machineCount: 5, share: 5 / 121 },
      { key: 'semi_autonomous', machineCount: 0, share: 0 },
      { key: 'autonomous', machineCount: 96, share: 96 / 121 },
      { key: null, machineCount: 20, share: 20 / 121 },
    ])
  })

  it('uses the deployment automation level before the product level', async () => {
    await query(`UPDATE deployment SET automation_level = 'semi_autonomous' WHERE id = 14`)

    const levels = (await findBreakdowns({})).byAutomationLevel
    expect(levels.find((level) => level.key === 'semi_autonomous')?.machineCount).toBe(20)
    expect(levels.find((level) => level.key === null)?.machineCount).toBe(0)
  })

  it('ranks manufacturers and suppliers within a selected machine type (FR-31)', async () => {
    const result = await findBreakdowns({ machineType: 'haul_truck' })

    expect(result.machineCount).toBe(116)
    expect(result.byManufacturer).toEqual([{ key: 'Caterpillar', machineCount: 116, share: 1 }])
    expect(result.bySupplier).toEqual([{ key: 'Caterpillar', machineCount: 116, share: 1 }])
  })

  it('returns zero shares rather than dividing by zero when nothing matches', async () => {
    const result = await findBreakdowns({ country: 'CA' })

    expect(result.machineCount).toBe(0)
    expect(result.byCountry).toEqual([])
    expect(result.byAutomationLevel.every((level) => level.machineCount === 0 && level.share === 0)).toBe(true)
  })
})
