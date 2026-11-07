export function parseError(err) {
  const res = err.response
  if (!res) return { message: 'Cannot reach the server. Check your connection.', fields: {} }

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