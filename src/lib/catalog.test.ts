import { FLUID_GROUP, ITEM_GROUPS, ITEM_SET, isFluid } from './catalog'

describe('isFluid', () => {
  it('recognizes fluids case-insensitively', () => {
    expect(isFluid('Water')).toBe(true)
    expect(isFluid('water')).toBe(true)
    expect(isFluid('Nitrogen Gas')).toBe(true)
  })
  it('rejects solids and empties', () => {
    expect(isFluid('Iron Ore')).toBe(false)
    expect(isFluid('')).toBe(false)
    expect(isFluid(null)).toBe(false)
    expect(isFluid(undefined)).toBe(false)
  })
})

describe('catalog integrity', () => {
  it('ITEM_SET contains both solids and fluids', () => {
    expect(ITEM_SET.has('Iron Ore')).toBe(true)
    expect(ITEM_SET.has('Water')).toBe(true)
    expect(ITEM_SET.has('Definitely Not An Item')).toBe(false)
  })
  it('every group is sorted alphabetically', () => {
    for (const [, items] of ITEM_GROUPS) {
      expect(items).toEqual([...items].sort())
    }
    expect(FLUID_GROUP[1]).toEqual([...FLUID_GROUP[1]].sort())
  })
})
