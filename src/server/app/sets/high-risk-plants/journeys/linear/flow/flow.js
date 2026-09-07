import { dashboardPage } from '../features/dashboard/page.js'
import { commodityTypePage } from '../features/commodity-type/page.js'

export const FLOW_ONLY_KEYS = []

export const sections = [
  { id: 'start', pages: [dashboardPage] },
  { id: 'commodity', pages: [commodityTypePage] }
]
