import type { MapSite } from '../types'

export const fixtureSites: MapSite[] = [
  {
    id: 'pilbara-alpha-demo',
    name: 'Pilbara Alpha Demo Site',
    region: 'Pilbara',
    country: 'Australia',
    latitude: -22.3,
    longitude: 118.7,
    deployments: [
      {
        id: 'deployment-alpha-1',
        machineModel: 'HX-900 Haul Truck',
        machineType: 'Haul Truck',
        manufacturer: 'Komatsu',
        supplier: 'TerraNav Systems',
        automationLevel: 'Autonomous',
        environment: 'Surface',
        status: 'operational',
        quantity: 12,
        commissioningDate: '2021-03-15',
      },
      {
        id: 'deployment-alpha-2',
        machineModel: 'DX-40 Drill',
        machineType: 'Drill',
        manufacturer: 'Epiroc',
        supplier: 'Atlas Automation',
        automationLevel: 'Teleremote',
        environment: 'Surface',
        status: 'commissioning',
        quantity: 4,
        commissioningDate: '2025-11-01',
      },
    ],
  },
  {
    id: 'goldfields-beta-demo',
    name: 'Goldfields Beta Demo Site',
    region: 'Goldfields-Esperance',
    country: 'Australia',
    latitude: -30.7,
    longitude: 121.5,
    deployments: [
      {
        id: 'deployment-beta-1',
        machineModel: 'LD-600 Loader',
        machineType: 'Loader',
        manufacturer: 'Caterpillar',
        supplier: 'DeepCore Robotics',
        automationLevel: 'Semi-autonomous',
        environment: 'Underground',
        status: 'announced',
        quantity: 6,
      },
    ],
  },
  {
    id: 'bowen-gamma-demo',
    name: 'Bowen Gamma Demo Site',
    region: 'Queensland',
    country: 'Australia',
    latitude: -23.5,
    longitude: 148.2,
    deployments: [
      {
        id: 'deployment-gamma-1',
        machineType: 'Dozer',
        manufacturer: 'Caterpillar',
        supplier: 'TerraNav Systems',
        automationLevel: 'Line-of-sight remote',
        environment: 'Surface',
        status: 'decommissioned',
        quantity: 3,
        commissioningDate: '2018-07-20',
      },
    ],
  },
]

export const highDensityFixtureSite: MapSite = {
  id: 'pilbara-high-density-demo',
  name: 'Pilbara High Density Demo Site',
  region: 'Pilbara',
  country: 'Australia',
  latitude: -21.8,
  longitude: 119.4,
  deployments: [
    {
      id: 'deployment-high-density-1',
      machineModel: 'HX-1000 Haul Truck',
      machineType: 'Haul Truck',
      manufacturer: 'Komatsu',
      supplier: 'Highland Automation',
      automationLevel: 'Autonomous',
      environment: 'Surface',
      status: 'operational',
      quantity: 60,
      commissioningDate: '2022-01-10',
    },
  ],
}

export const densityFixtureSites: MapSite[] = [...fixtureSites, highDensityFixtureSite]
