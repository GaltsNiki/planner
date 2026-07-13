import { describe, it, expect } from 'vitest'
import { serialize, deserialize } from '../persist'
import { seedData } from '../seed'

describe('persist', () => {
  it('round-trips a document unchanged', () => {
    const data = seedData()
    const back = deserialize(serialize(data))
    expect(back).toEqual(data)
  })

  it('returns null on unparseable JSON (so callers can recover, not silently reseed)', () => {
    expect(deserialize('{ not json')).toBeNull()
    expect(deserialize('')).toBeNull()
  })

  it('returns null for non-object JSON', () => {
    expect(deserialize('[1,2,3]')).toBeNull()
    expect(deserialize('"a string"')).toBeNull()
    expect(deserialize('42')).toBeNull()
  })

  it('backfills missing top-level keys from seed', () => {
    const partial = deserialize(JSON.stringify({ goals: [], version: 1 }))
    expect(partial).not.toBeNull()
    expect(partial!.goals).toEqual([])
    // Missing keys come from the seed.
    expect(partial!.habits).toEqual(seedData().habits)
    expect(partial!.settings).toEqual(seedData().settings)
    // version is taken from the parsed doc, not the seed.
    expect(partial!.version).toBe(1)
  })

  it('preserves a missing version as undefined (pre-migration marker)', () => {
    const parsed = deserialize(JSON.stringify({ goals: [], tasks: [] }))
    expect(parsed!.version).toBeUndefined()
  })
})
