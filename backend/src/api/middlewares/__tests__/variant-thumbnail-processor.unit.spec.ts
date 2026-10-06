import { variantThumbnailProcessor } from '../variant-thumbnail-processor'

describe('public product response', () => {
  it.each(['product', 'products'])('keeps only public active categories and preserves variant images for %s', async (key) => {
    const product = {
      id: 'prod_public',
      categories: [
        { id: 'cat_public', is_internal: false, is_active: true },
        { id: 'cat_internal', is_internal: true, is_active: true },
        { id: 'cat_inactive', is_internal: false, is_active: false },
      ],
      variants: [{ id: 'variant_a', metadata: { images: [{ url: 'https://images.unsplash.com/example' }] } }],
    }
    const json = jest.fn()
    const res = { json } as any
    const next = jest.fn()
    await variantThumbnailProcessor({} as any, res, next)
    res.json({ [key]: key === 'product' ? product : [product] })
    expect(product.categories.map(category => category.id)).toEqual(['cat_public'])
    expect((product.variants[0] as any).thumbnail).toBe('https://images.unsplash.com/example')
    expect(next).toHaveBeenCalledTimes(1)
    expect(json).toHaveBeenCalledTimes(1)
  })
})
