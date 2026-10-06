import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('./fixtures.js')

/**
 * The database enforces the verification rules itself, so a bug in the
 * application, or a manual change, cannot leave history rewritten or a
 * verified record without its evidence. Fixture deployment 12 is pending
 * review with a technology product and no evidence; 10, 11 and 14 are verified.
 */

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
  await query(`
    INSERT INTO admin_user (id, email, password_hash, active) VALUES
      (1, 'active@example.com', 'test-hash', true),
      (2, 'inactive@example.com', 'test-hash', false);
    INSERT INTO contributor (id, email) VALUES (1, 'contributor@example.com');
  `)
})

afterAll(async () => {
  await closeDatabase()
})

describe('append-only history', () => {
  beforeEach(async () => {
    await query(`
      INSERT INTO verification_review (deployment_id, admin_user_id, decision, review_note) VALUES (12, 1, 'needs_changes', 'More evidence');
      INSERT INTO revision (deployment_id, contributor_id, action, previous_values) VALUES (12, 1, 'update', '{"quantity": 6}');
    `)
  })

  it.each(['verification_review', 'revision'])('refuses to update, delete or truncate %s', async (table) => {
    await expect(query(`UPDATE ${table} SET deployment_id = 10`)).rejects.toThrow(`${table} is append-only; UPDATE is forbidden`)
    await expect(query(`DELETE FROM ${table}`)).rejects.toThrow(`${table} is append-only; DELETE is forbidden`)
    await expect(query(`TRUNCATE ${table} CASCADE`)).rejects.toThrow(`${table} is append-only; TRUNCATE is forbidden`)
    expect(await query(`SELECT COUNT(*)::int AS count FROM ${table}`)).toEqual([{ count: 1 }])
  })

  it('refuses a review by an inactive administrator', async () => {
    await expect(
      query("INSERT INTO verification_review (deployment_id, admin_user_id, decision) VALUES (12, 2, 'approved')"),
    ).rejects.toThrow('Verification review requires an active administrator')
  })

  it('refuses a revision attributed to both a contributor and an administrator', async () => {
    await expect(
      query("INSERT INTO revision (deployment_id, contributor_id, admin_user_id, action) VALUES (12, 1, 1, 'update')"),
    ).rejects.toMatchObject({ code: '23514', constraint: 'revision_at_most_one_actor' })
  })
})

describe('verified records', () => {
  it('cannot be verified without a technology product', async () => {
    await expect(
      query("UPDATE deployment SET technology_product_id = NULL, verification_status = 'verified' WHERE id = 12"),
    ).rejects.toMatchObject({ code: '23514', constraint: 'deployment_verified_requires_technology_product' })
  })

  it('cannot be verified without evidence when the transaction commits', async () => {
    await expect(
      query("BEGIN; UPDATE deployment SET verification_status = 'verified' WHERE id = 12; COMMIT;"),
    ).rejects.toThrow('Verified deployment requires at least one evidence URL')
    expect(await query("SELECT verification_status::text AS status FROM deployment WHERE id = 12")).toEqual([{ status: 'pending_review' }])
  })

  it('can gain evidence and verification in either order within one transaction', async () => {
    await query(`
      BEGIN;
      UPDATE deployment SET verification_status = 'verified' WHERE id = 12;
      INSERT INTO evidence (deployment_id, url, source_type) VALUES (12, 'https://example.com/evidence/12', 'news');
      COMMIT;
    `)
    expect(await query("SELECT verification_status::text AS status FROM deployment WHERE id = 12")).toEqual([{ status: 'verified' }])
  })

  it('cannot lose their last evidence URL', async () => {
    await expect(query('DELETE FROM evidence WHERE deployment_id = 10')).rejects.toThrow(
      'Verified deployment requires at least one evidence URL',
    )
    expect(await query('SELECT COUNT(*)::int AS count FROM evidence WHERE deployment_id = 10')).toEqual([{ count: 1 }])
  })
})

describe('deployment data', () => {
  it('refuses the same evidence URL twice for one deployment', async () => {
    await expect(
      query("INSERT INTO evidence (deployment_id, url, source_type) VALUES (10, 'https://example.com/evidence/10', 'news')"),
    ).rejects.toMatchObject({ code: '23505', constraint: 'evidence_deployment_url_unique' })
  })

  it('refuses a commissioning year that disagrees with the full date', async () => {
    await expect(
      query("UPDATE deployment SET commissioning_date = '2021-06-01', commissioning_year = 2020 WHERE id = 12"),
    ).rejects.toMatchObject({ code: '23514', constraint: 'deployment_commissioning_precision' })
  })

  it('keeps a year without inventing a date', async () => {
    await query('UPDATE deployment SET commissioning_date = NULL, commissioning_year = 2024 WHERE id = 12')
    expect(
      await query('SELECT commissioning_date, commissioning_year FROM deployment WHERE id = 12'),
    ).toEqual([{ commissioning_date: null, commissioning_year: 2024 }])
  })
})
