export const causeInclude = {
  _count: {
    select: { like: true, donation: true },
  },
  category: true,
}
