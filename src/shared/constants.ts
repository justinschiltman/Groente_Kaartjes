export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

/** Cards are always designed at their final print size — one third of an A4 sheet by default,
 * since the batch export stacks that many per page (see main/services/pdfComposer.service.ts). */
export const DEFAULT_CARD_WIDTH_MM = A4_WIDTH_MM
export const DEFAULT_CARD_HEIGHT_MM = A4_HEIGHT_MM / 3
