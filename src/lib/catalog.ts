/**
 * Satisfactory item catalog (satisfactory.wiki.gg, 1.0), ported 1:1 from the
 * legacy prototype. Each group is [label, items]. Fluids/gases are tracked
 * separately because they can only ride fluid cars / dock fluid platforms.
 */
export type ItemGroup = [label: string, items: string[]]

export const ITEM_GROUPS: ItemGroup[] = [
  ['Resources', ['Bauxite', 'Caterium Ore', 'Coal', 'Compacted Coal', 'Copper Ore', 'Iron Ore', 'Limestone', 'Raw Quartz', 'SAM', 'Sulfur', 'Uranium', 'Wood', 'Leaves', 'Mycelia', 'Flower Petals', 'Bacon Agaric', 'Beryl Nut', 'Paleberry', 'Blue Power Slug', 'Yellow Power Slug', 'Purple Power Slug', 'Mercer Sphere', 'Somersloop', 'Hard Drive']],
  ['Ingots', ['Iron Ingot', 'Copper Ingot', 'Steel Ingot', 'Caterium Ingot', 'Aluminum Ingot', 'Aluminum Scrap', 'Ficsite Ingot']],
  ['Standard parts', ['Iron Plate', 'Iron Rod', 'Screw', 'Reinforced Iron Plate', 'Modular Frame', 'Heavy Modular Frame', 'Fused Modular Frame', 'Steel Beam', 'Steel Pipe', 'Encased Industrial Beam', 'Concrete', 'Wire', 'Cable', 'Quickwire', 'Copper Sheet', 'Copper Powder', 'Alclad Aluminum Sheet', 'Aluminum Casing', 'Silica', 'Quartz Crystal', 'Crystal Oscillator', 'Rotor', 'Stator', 'Motor', 'Turbo Motor', 'Battery', 'Heat Sink', 'Cooling System', 'Fabric', 'Empty Canister', 'Empty Fluid Tank', 'Power Shard', 'Gas Filter', 'Iodine-Infused Filter', 'Color Cartridge', 'FICSIT Coupon']],
  ['Oil & biomass', ['Plastic', 'Rubber', 'Polymer Resin', 'Petroleum Coke', 'Biomass', 'Solid Biofuel', 'Black Powder', 'Smokeless Powder', 'Packaged Water', 'Packaged Oil', 'Packaged Heavy Oil Residue', 'Packaged Fuel', 'Packaged Liquid Biofuel', 'Packaged Turbofuel', 'Packaged Rocket Fuel', 'Packaged Ionized Fuel', 'Packaged Alumina Solution', 'Packaged Sulfuric Acid', 'Packaged Nitric Acid', 'Packaged Nitrogen Gas']],
  ['Electronics', ['Circuit Board', 'AI Limiter', 'High-Speed Connector', 'Computer', 'Supercomputer', 'Radio Control Unit', 'Electromagnetic Control Rod']],
  ['Nuclear', ['Encased Uranium Cell', 'Uranium Fuel Rod', 'Uranium Waste', 'Non-Fissile Uranium', 'Plutonium Pellet', 'Encased Plutonium Cell', 'Plutonium Fuel Rod', 'Plutonium Waste', 'Ficsonium', 'Ficsonium Fuel Rod']],
  ['Quantum & endgame', ['Time Crystal', 'Diamonds', 'Dark Matter Crystal', 'Ficsite Trigon', 'Reanimated SAM', 'SAM Fluctuator', 'Superposition Oscillator', 'Neural-Quantum Processor', 'AI Expansion Server', 'Alien Power Matrix', 'Singularity Cell', 'Ballistic Warp Drive', 'Biochemical Sculptor']],
  ['Project Assembly parts', ['Smart Plating', 'Versatile Framework', 'Automated Wiring', 'Modular Engine', 'Adaptive Control Unit', 'Assembly Director System', 'Magnetic Field Generator', 'Thermal Propulsion Rocket', 'Nuclear Pasta', 'Pressure Conversion Cube']],
  ['Alien', ['Hog Remains', 'Hatcher Remains', 'Stinger Remains', 'Spitter Remains', 'Alien Protein', 'Alien DNA Capsule']],
  ['Ammunition', ['Iron Rebar', 'Stun Rebar', 'Shatter Rebar', 'Explosive Rebar', 'Nobelisk', 'Gas Nobelisk', 'Pulse Nobelisk', 'Cluster Nobelisk', 'Nuke Nobelisk', 'Rifle Ammo', 'Homing Rifle Ammo', 'Turbo Rifle Ammo']],
]

export const FLUID_GROUP: ItemGroup = ['Fluids & gases', ['Water', 'Crude Oil', 'Heavy Oil Residue', 'Fuel', 'Liquid Biofuel', 'Turbofuel', 'Rocket Fuel', 'Ionized Fuel', 'Alumina Solution', 'Sulfuric Acid', 'Nitric Acid', 'Nitrogen Gas', 'Dissolved Silica', 'Dark Matter Residue', 'Excited Photonic Matter', 'Quantum Energy']]

ITEM_GROUPS.forEach((g) => g[1].sort())
FLUID_GROUP[1].sort()

export const ITEM_SET = new Set(ITEM_GROUPS.flatMap((g) => g[1]).concat(FLUID_GROUP[1]))
const FLUID_SET = new Set(FLUID_GROUP[1].map((f) => f.toLowerCase()))

export const isFluid = (item: string | null | undefined): boolean =>
  FLUID_SET.has(String(item ?? '').toLowerCase())
