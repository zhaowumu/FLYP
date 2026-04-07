import api from './index'

export function globalSearch(query: string) {
  return api.get('/search', { params: { q: query } })
}
