import { describe, expect, it } from 'vitest'

import { ENUM_TYPES } from '../lib/controlled-values.js'
import { automationLevel, deploymentStatus, installationType, machineType, miningEnvironment } from './schema.js'

/**
 * The API-facing lists in lib/controlled-values.ts and the introspected
 * pgEnums must not drift apart. The reference-data route test already checks
 * the lists against the live database; this closes the remaining side by
 * checking them against the committed Drizzle schema without a database.
 */
const SCHEMA_ENUMS = {
  machine_type: machineType,
  automation_level: automationLevel,
  mining_environment: miningEnvironment,
  deployment_status: deploymentStatus,
  installation_type: installationType,
} satisfies Record<keyof typeof ENUM_TYPES, { enumName: string; enumValues: readonly string[] }>

describe('controlled values', () => {
  it('match the pgEnum values in the committed Drizzle schema', () => {
    for (const [typeName, values] of Object.entries(ENUM_TYPES)) {
      const schemaEnum = SCHEMA_ENUMS[typeName as keyof typeof ENUM_TYPES]
      expect(schemaEnum.enumName, typeName).toBe(typeName)
      expect(schemaEnum.enumValues, typeName).toEqual([...values])
    }
  })
})
