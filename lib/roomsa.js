import crypto from 'crypto'
import { buildThemeResult } from './slotUtils'

const BRAND_KEYCODE = 'LmnDt6wGgVEUpPC5'
const SHOP_CODE      = 'DDZfLJDVcss3dP7Q' // 강남점
const BASE_URL       = 'https://macro.playthe.world'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'

export const ROOMSA_BRANCHES = [
  { id: 'roomsa-gangnam', name: '강남점', brand: '룸즈에이', location: '강남' },
]

// 순위는 코로리 강남 랭킹(쎄비지 > 메가 게임 > 비틀배틀-퍼플 > 33: DOOR RUN > GALAXY HYPRESS) 순
export const ROOMSA_THEMES = [
  {
    id: 'roomsa-gangnam-savage', name: '쎄비지 (SAVAGE)', emoji: '🕶️',
    branchId: 'roomsa-gangnam', branch: '강남점',
    themeApiId: 371,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `https://roomsa.co.kr/reservation.html?keycode=${SHOP_CODE}`,
  },
  {
    id: 'roomsa-gangnam-megagame', name: '메가 게임 (MEGA GAME)', emoji: '🎮',
    branchId: 'roomsa-gangnam', branch: '강남점',
    themeApiId: 369,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `https://roomsa.co.kr/reservation.html?keycode=${SHOP_CODE}`,
  },
  {
    id: 'roomsa-gangnam-beetlebattle', name: '비틀배틀-퍼플 (BEETLE BATTLE)', emoji: '🪲',
    branchId: 'roomsa-gangnam', branch: '강남점',
    themeApiId: 370,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `https://roomsa.co.kr/reservation.html?keycode=${SHOP_CODE}`,
  },
  {
    id: 'roomsa-gangnam-doorrun', name: '33: DOOR RUN (도어런)', emoji: '🚪',
    branchId: 'roomsa-gangnam', branch: '강남점',
    themeApiId: 395,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `https://roomsa.co.kr/reservation.html?keycode=${SHOP_CODE}`,
  },
  {
    id: 'roomsa-gangnam-galaxyhypress', name: 'GALAXY HYPRESS (갤럭시 하이프리스)', emoji: '🌌',
    branchId: 'roomsa-gangnam', branch: '강남점',
    themeApiId: 379,
    openDaysAhead: null, openHour: null, openMinute: null,
    reserveUrl: `https://roomsa.co.kr/reservation.html?keycode=${SHOP_CODE}`,
  },
]

function makeJWT(secret, payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

// 매장 하나에 테마가 여러 개 걸려있어도 fetch는 한 번만 — 동시 호출 시 진행 중인 요청을 공유
const _shopCache = new Map()
function getShopThemes(shopCode) {
  if (!_shopCache.has(shopCode)) {
    _shopCache.set(shopCode, _fetchShopThemes(shopCode).finally(() => _shopCache.delete(shopCode)))
  }
  return _shopCache.get(shopCode)
}

async function _fetchShopThemes(shopCode) {
  const random = Math.random().toString(36).slice(2, 14)
  const jwt    = makeJWT(BRAND_KEYCODE, { 'X-Auth-Token': random, expired_at: Date.now() / 1000 + 3600 })

  const res = await fetch(`${BASE_URL}/v2/shops/${shopCode}`, {
    headers: {
      'accept': '*/*',
      'bearer-token': BRAND_KEYCODE,
      'name': 'roomsa',
      'origin': 'https://roomsa.co.kr',
      'referer': 'https://roomsa.co.kr/',
      'site-referer': 'https://roomsa.co.kr',
      'user-agent': UA,
      'x-request-option': jwt,
      'x-request-origin': 'https://roomsa.co.kr',
      'x-secure-random': random,
    },
  })
  const data = await res.json()
  if (data.result === 'fail') throw new Error(`roomsa API 실패: ${data.message}`)
  return data.data.themes
}

function isFutureSlot(dateStr, timeStr) {
  return new Date() < new Date(`${dateStr}T${timeStr}:00+09:00`)
}

export async function fetchRoomsaThemeSlots(themeId, skipDows = new Set()) {
  const theme = ROOMSA_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown roomsa theme: ${themeId}`)

  const themes   = await getShopThemes(SHOP_CODE)
  const apiTheme = themes.find(t => t.id === theme.themeApiId)
  if (!apiTheme) return {}

  const slots = {}
  for (const slot of (apiTheme.slots ?? [])) {
    if (!slot.can_book) continue
    const dateStr = slot.day_string       // YYYY-MM-DD
    const timeStr = slot.integer_to_time  // HH:MM
    if (!isFutureSlot(dateStr, timeStr)) continue

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

export async function fetchAllRoomsaSlots() {
  const results = await Promise.all(
    ROOMSA_THEMES.map(async (theme) => {
      const slots = await fetchRoomsaThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}
