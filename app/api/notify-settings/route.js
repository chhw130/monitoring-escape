const GH_TOKEN = process.env.GH_PAT
const GH_REPO  = process.env.GH_REPO
const API_BASE = `https://api.github.com/repos/${GH_REPO}/actions/variables`

const GH_HEADERS = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

const VARIABLE_NAMES = [
  'NOTIFY_DAY_MIN', 'NOTIFY_DAY_MAX', 'NOTIFY_THEMES', 'NOTIFY_THEME_SETTINGS', 'NOTIFY_DISABLED_THEMES',
  'NOTIFY_DAY_MIN_B', 'NOTIFY_DAY_MAX_B', 'NOTIFY_THEMES_B', 'NOTIFY_THEME_SETTINGS_B', 'NOTIFY_DISABLED_THEMES_B',
  'NOTIFY_DAY_MIN_C', 'NOTIFY_DAY_MAX_C', 'NOTIFY_THEMES_C', 'NOTIFY_THEME_SETTINGS_C', 'NOTIFY_DISABLED_THEMES_C',
  'NOTIFY_CHANNEL_DISABLED', 'NOTIFY_CHANNEL_DISABLED_B', 'NOTIFY_CHANNEL_DISABLED_C',
]
const DEFAULTS = {
  NOTIFY_DAY_MIN: '0,17,17,17,17,17,0', NOTIFY_DAY_MAX: '24,24,24,24,24,24,24',
  NOTIFY_THEMES: '', NOTIFY_THEME_SETTINGS: '{}', NOTIFY_DISABLED_THEMES: '',
  NOTIFY_DAY_MIN_B: '0,17,17,17,17,17,0', NOTIFY_DAY_MAX_B: '24,24,24,24,24,24,24',
  NOTIFY_THEMES_B: '', NOTIFY_THEME_SETTINGS_B: '{}', NOTIFY_DISABLED_THEMES_B: '',
  NOTIFY_DAY_MIN_C: '0,17,17,17,17,17,0', NOTIFY_DAY_MAX_C: '24,24,24,24,24,24,24',
  NOTIFY_THEMES_C: '', NOTIFY_THEME_SETTINGS_C: '{}', NOTIFY_DISABLED_THEMES_C: '',
  NOTIFY_CHANNEL_DISABLED: 'false', NOTIFY_CHANNEL_DISABLED_B: 'false', NOTIFY_CHANNEL_DISABLED_C: 'false',
}

export async function GET() {
  const result = { ...DEFAULTS }
  await Promise.all(
    VARIABLE_NAMES.map(async (name) => {
      const res = await fetch(`${API_BASE}/${name}`, { headers: GH_HEADERS })
      if (res.ok) {
        const data = await res.json()
        result[name] = data.value
      }
    })
  )
  return Response.json(result)
}

export async function POST(req) {
  const body = await req.json()

  await Promise.all(
    Object.entries(body).map(async ([name, value]) => {
      // 먼저 PATCH 시도, 없으면 POST로 생성
      const patchRes = await fetch(`${API_BASE}/${name}`, {
        method: 'PATCH',
        headers: GH_HEADERS,
        body: JSON.stringify({ name, value: String(value) }),
      })
      if (patchRes.status === 404) {
        await fetch(API_BASE, {
          method: 'POST',
          headers: GH_HEADERS,
          body: JSON.stringify({ name, value: String(value) }),
        })
      }
    })
  )

  return Response.json({ ok: true })
}
