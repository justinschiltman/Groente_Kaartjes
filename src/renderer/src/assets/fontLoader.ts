import type { FontVariantWithData } from '@shared/types/asset'

async function registerVariant(variant: FontVariantWithData): Promise<string> {
  const face = new FontFace(variant.familyName, variant.data, {
    weight: variant.bold ? 'bold' : 'normal',
    style: variant.italic ? 'italic' : 'normal'
  })
  await face.load()
  document.fonts.add(face)
  return variant.familyName
}

function uniqueFamilyNames(variants: FontVariantWithData[]): string[] {
  return Array.from(new Set(variants.map((v) => v.familyName))).sort((a, b) => a.localeCompare(b))
}

export async function loadPersistedFonts(): Promise<string[]> {
  const variants = await window.api.listFonts()
  await Promise.all(variants.map(registerVariant))
  return uniqueFamilyNames(variants)
}

export async function importFonts(): Promise<string[]> {
  const variants = await window.api.importFonts()
  await Promise.all(variants.map(registerVariant))
  return uniqueFamilyNames(variants)
}
