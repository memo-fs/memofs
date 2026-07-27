import { createContentLoader } from 'vitepress'

export default createContentLoader('learn/cookbooks/*.md', {
  includeSrc: false,
  render: false,
  transform(rawData) {
    return rawData
      .filter((item) => !item.url.endsWith('/cookbooks/') && !item.url.endsWith('/cookbooks/index.html'))
      .sort((a, b) => {
        const aDate = a.frontmatter.date ? new Date(a.frontmatter.date) : new Date()
        const bDate = b.frontmatter.date ? new Date(b.frontmatter.date) : new Date()
        return +bDate - +aDate
      })
  }
})

