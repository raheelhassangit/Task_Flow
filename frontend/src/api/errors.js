function formatWait(s) {
  if (s < 90) return `${s} seconds`
  if (s < 5400) return `${Math.ceil(s / 60)} minutes`
  return `${Math.ceil(s / 3600)} hours`
}

export function parseError(err) {
  const res = err.response
  if (!res) return { message: 'Cannot reach the server. Check your connection.', fields: {} }

  if (res.status === 429) {
    const secs = Number(res.headers?.['retry-after'])
    const wait = secs > 0 ? formatWait(secs) : 'a little while'
    return { message: `Too many attempts. Please try again in ${wait}.`, fields: {} }
  }

  const errors = res.data?.errors
  if (!errors) return { message: 'Something went wrong. Please try again.', fields: {} }
  if (Array.isArray(errors)) return { message: errors.join(' '), fields: {} }
  if (errors.detail) return { message: String(errors.detail), fields: {} }

  const fields = {}
  for (const [key, value] of Object.entries(errors)) {
    fields[key] = Array.isArray(value) ? value.join(' ') : String(value)
  }
  return { message: fields.non_field_errors ?? '', fields }
}