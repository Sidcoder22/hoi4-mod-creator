// Base64 ohne Node-Buffer, damit es im Browser und in Tests gleich laeuft.

export function zuBase64(bytes) {
  let s = ''
  const stueck = 0x8000
  for (let i = 0; i < bytes.length; i += stueck) s += String.fromCharCode.apply(null, bytes.subarray(i, i + stueck))
  return btoa(s)
}

export function ausBase64(text) {
  const s = atob(text)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}
