import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { findBreakdowns, findTimeline } = await import('./analytics.js')

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
    expect(result.byStatus).toEqual([
      { key: 'operational', machineCount: 96, share: 96 / 121 },
      { key: 'decommissioned', machineCount: 20, share: 20 / 121 },
      { key: 'commissioning', machineCount: 5, share: 5 / 121 },
    ])
  })

  it('lists every automation level in order, with nothing unclassified now that each deployment carries one', async () => {
    const result = await findBreakdowns({})

    // Deployment 14's product has no level, but the deployment's own level counts
    expect(result.byAutomationLevel).toEqual([
      { key: 'operator_assistance', machineCount: 20, share: 20 / 121 },
      { key: 'teleremote', machineCount: 5, share: 5 / 121 },
      { key: 'semi_autonomous', machineCount: 0, share: 0 },
      { key: 'autonomous', machineCount: 96, share: 96 / 121 },
      { key: null, machineCount: 0, share: 0 },
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

describe('findTimeline', () => {
  it('counts machines commissioned and in service each year up to the current year', async () => {
    const { years } = await findTimeline({})

    // Deployment 14: 20 machines from 2015, valid to 2020-12-31; deployment 10: 96 machines from 2021
    expect(years[0]).toEqual({ year: 2015, newlyCommissioned: 20, inService: 20 })
    expect(years.find((row) => row.year === 2018)).toEqual({ year: 2018, newlyCommissioned: 0, inService: 20 })
    expect(years.find((row) => row.year === 2020)).toEqual({ year: 2020, newlyCommissioned: 0, inService: 20 })
    expect(years.find((row) => row.year === 2021)).toEqual({ year: 2021, newlyCommissioned: 96, inService: 96 })

    const [{ currentYear } = { currentYear: 0 }] = await query<{ currentYear: number }>(
      'SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS "currentYear"',
    )
    const last = years.at(-1)
    expect(last?.year).toBe(currentYear)
    expect(last?.inService).toBe(96)
    expect(years.map((row) => row.year)).toEqual(Array.from({ length: years.length }, (_, index) => 2015 + index))
  })

  it('reports undated deployments as excluded instead of placing them in a year', async () => {
    const timeline = await findTimeline({})

    // Deployment 11 (5 machines) has no commissioning date or year
    expect(timeline.excludedCount).toBe(1)
    expect(timeline.excludedMachineCount).toBe(5)
  })

  it('counts a deployment in service only from its valid_from, even when commissioned earlier', async () => {
    // As after a relocation: commissioned in 2021, but this record is only valid from mid-2023
    await query(`UPDATE deployment SET valid_from = '2023-06-01' WHERE id = 10`)

    const { years } = await findTimeline({})
    expect(years.find((row) => row.year === 2021)).toEqual({ year: 2021, newlyCommissioned: 96, inService: 0 })
    expect(years.find((row) => row.year === 2022)).toEqual({ year: 2022, newlyCommissioned: 0, inService: 0 })
    expect(years.find((row) => row.year === 2023)).toEqual({ year: 2023, newlyCommissioned: 0, inService: 96 })
  })

  it('places year-only commissioning in its year without inventing a date', async () => {
    // A year-only contribution has no valid_from, since only a full date sets it
    await query('UPDATE deployment SET commissioning_year = 2019, valid_from = NULL WHERE id = 11')

    const timeline = await findTimeline({})
    expect(timeline.years.find((row) => row.year === 2019)).toEqual({ year: 2019, newlyCommissioned: 5, inService: 25 })
    expect(timeline.excludedCount).toBe(0)
  })

  it('stops at the current year even when a deployment is dated later', async () => {
    await query('UPDATE deployment SET commissioning_year = EXTRACT(YEAR FROM CURRENT_DATE)::int + 2 WHERE id = 11')

    const { years } = await findTimeline({})
    const [{ currentYear } = { currentYear: 0 }] = await query<{ currentYear: number }>(
      'SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS "currentYear"',
    )
    expect(years.at(-1)?.year).toBe(currentYear)
    expect(years.reduce((total, row) => total + row.newlyCommissioned, 0)).toBe(116)
  })

  it('leaves announced deployments out of both measures and the excluded count', async () => {
    await query(`
      BEGIN;
      INSERT INTO deployment (id, site_id, machine_model_id, technology_supplier_id, technology_product_id, quantity, status, verification_status, commissioning_year, automation_level)
      VALUES (15, 2, 1, 1, 1, 7, 'announced', 'verified', 2022, 'autonomous'), (16, 2, 1, 1, 1, 3, 'announced', 'verified', NULL, 'autonomous');
      INSERT INTO evidence (deployment_id, url, source_type) VALUES
        (15, 'https://example.com/evidence/15', 'news'),
        (16, 'https://example.com/evidence/16', 'news');
      COMMIT;
    `)

    const timeline = await findTimeline({})
    expect(timeline.years.find((row) => row.year === 2022)).toEqual({ year: 2022, newlyCommissioned: 0, inService: 96 })
    expect(timeline.excludedCount).toBe(1)
    expect(timeline.excludedMachineCount).toBe(5)
  })

  it('applies the shared filters', async () => {
    const rct = await findTimeline({ supplier: 'RCT' })
    expect(rct).toEqual({ years: [], excludedCount: 1, excludedMachineCount: 5 })

    expect(await findTimeline({ country: 'CA' })).toEqual({ years: [], excludedCount: 0, excludedMachineCount: 0 })
  })
})
