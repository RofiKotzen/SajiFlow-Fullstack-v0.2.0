import { BadRequestException } from "@nestjs/common";

export function validatePerishableShelfLife(
  isPerishable: boolean,
  shelfLife?: number | null,
): void {
  if (isPerishable && !shelfLife) {
    throw new BadRequestException(
      "Shelf life wajib diisi untuk bahan mudah rusak.",
    );
  }
}

export function validateStockLevels(
  minimumStock = 0,
  reorderPoint = 0,
  parStock = 0,
): void {
  if (reorderPoint < minimumStock) {
    throw new BadRequestException(
      "Reorder point tidak boleh lebih kecil dari minimum stock.",
    );
  }
  if (parStock > 0 && parStock < reorderPoint) {
    throw new BadRequestException(
      "Par stock tidak boleh lebih kecil dari reorder point.",
    );
  }
}
