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
        supplier: 'TerraNav Systems',
        status: 'operational',
        quantity: 12,
      },
      {
        id: 'deployment-alpha-2',
        machineModel: 'DX-40 Drill',
        supplier: 'Atlas Automation',
        status: 'commissioning',
        quantity: 4,
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
        supplier: 'DeepCore Robotics',
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
        machineModel: 'DZ-80 Dozer',
        supplier: 'TerraNav Systems',
        status: 'decommissioned',
        quantity: 3,
      },
    ],
  },
]