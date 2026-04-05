import api from './index'

export const getCustomLinks = () => api.get('/custom-links')

export const updateCustomLinks = (links: any) => api.put('/custom-links', links)

export const listMarkdownFiles = () => api.get('/markdown/list')
