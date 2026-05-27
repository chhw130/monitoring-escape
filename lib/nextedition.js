import crypto from 'crypto'
import { buildThemeResult } from './slotUtils'

const BRAND_KEYCODE = 'fanEiYJgoTWk79Vu'
const BASE_URL      = 'https://macro.playthe.world'

export const NEXTEDITION_BRANCHES = [
  { id: 'nextedition-kondae2', name: '건대2호점', brand: '넥스트에디션', location: '건대' },
]

export const NEXTEDITION_THEMES = [
  {
    id: 'nextedition-kondae2-survivor', name: '생존자', emoji: '🧟',
    branchId: 'nextedition-kondae2', branch: '건대2호점',
    shopCode: 'KAuTx3m4n65nuMNB', themeApiId: 327,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: 'https://www.nextedition.co.kr/reservation.html?keycode=KAuTx3m4n65nuMNB',
  },
]

function makeJWT(secret, payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

async function fetchShopThemes(shopCode) {
  const random = Math.random().toString(36).slice(2, 14)
  const jwt    = makeJWT(BRAND_KEYCODE, { 'X-Auth-Token': random, expired_at: Date.now() / 1000 + 3600 })

  const res = await fetch(`${BASE_URL}/v2/shops/${shopCode}`, {
    headers: {
      'accept': '*/*',
      'bearer-token': BRAND_KEYCODE,
      'name': 'nextedition',
      'origin': 'https://www.nextedition.co.kr',
      'referer': 'https://www.nextedition.co.kr/',
      'site-referer': 'https://next-edition.co.kr',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      'x-request-option': jwt,
      'x-request-origin': 'https://next-edition.co.kr',
      'x-secure-random': random,
    },
  })
  const data = await res.json()
  if (data.result === 'fail') throw new Error(`nextedition API 실패: ${data.message}`)
  return data.data.themes
}

export async function fetchNexteditionThemeSlots(themeId, skipDows = new Set()) {
  const theme = NEXTEDITION_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown nextedition theme: ${themeId}`)

  const themes   = await fetchShopThemes(theme.shopCode)
  const apiTheme = themes.find(t => t.id === theme.themeApiId)
  if (!apiTheme) return {}

  const slots = {}
  for (const slot of (apiTheme.slots ?? [])) {
    if (!slot.can_book) continue
    const dateStr = slot.day_string       // YYYY-MM-DD
    const timeStr = slot.integer_to_time  // HH:MM

    if (skipDows.size > 0) {
      const dow = new Date(dateStr + 'T00:00:00').getDay()
      if (skipDows.has(dow)) continue
    }

    if (!slots[dateStr]) slots[dateStr] = []
    slots[dateStr].push(timeStr)
  }

  for (const dateStr of Object.keys(slots)) { slots[dateStr].sort() }

  return slots
}

export async function fetchAllNexteditionSlots() {
  const results = await Promise.all(
    NEXTEDITION_THEMES.map(async (theme) => {
      const slots = await fetchNexteditionThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
