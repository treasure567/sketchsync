import type { Bounds } from "@sketchsync/common";

export const DEFAULT_SPATIAL_GRID_CELL_SIZE = 512;

// A few huge items (big frames, long diagonal arrows) would otherwise fill
// thousands of cells each, so past this they go to a short flat list.
const MAX_CELLS_PER_ITEM = 256;

const MAX_CELL_INDEX = 2 ** 24;
const CELL_KEY_STRIDE = 2 ** 25;

type CellRange = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

type Placement<T> = {
  readonly item: T;
  bounds: Bounds;
  cells: CellRange | null;
  lastSearch: number;
};

type Cell<T> = {
  readonly x: number;
  readonly y: number;
  readonly placements: Set<Placement<T>>;
};

const cellKey = (x: number, y: number) => x * CELL_KEY_STRIDE + y;

const cellCount = (range: CellRange) =>
  (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1);

// Also false for NaN, infinite and inverted ranges.
const isWithinCellKeyRange = (range: CellRange) =>
  range.minX <= range.maxX &&
  range.minY <= range.maxY &&
  -range.minX < MAX_CELL_INDEX &&
  -range.minY < MAX_CELL_INDEX &&
  range.maxX < MAX_CELL_INDEX &&
  range.maxY < MAX_CELL_INDEX;

const isSameCellRange = (a: CellRange | null, b: CellRange | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.minX === b.minX &&
    a.minY === b.minY &&
    a.maxX === b.maxX &&
    a.maxY === b.maxY);

export const boundsIntersect = (a: Bounds, b: Bounds) =>
  a[0] <= b[2] && a[1] <= b[3] && a[2] >= b[0] && a[3] >= b[1];

export class SpatialGrid<T> {
  private readonly cells = new Map<number, Cell<T>>();
  private readonly placements = new Map<T, Placement<T>>();
  private readonly oversized = new Set<Placement<T>>();
  private searchCount = 0;

  constructor(readonly cellSize: number = DEFAULT_SPATIAL_GRID_CELL_SIZE) {
    // With a power of two, `x / cellSize` is exact, so an item and a search
    // area that only touch at a cell border always meet in the same cell.
    if (!(cellSize > 0) || !Number.isInteger(Math.log2(cellSize))) {
      throw new Error(
        `SpatialGrid cell size must be a power of two, got ${cellSize}`,
      );
    }
  }

  get size() {
    return this.placements.size;
  }

  get occupiedCellCount() {
    return this.cells.size;
  }

  getBounds(item: T): Bounds | undefined {
    return this.placements.get(item)?.bounds;
  }

  set(item: T, bounds: Bounds) {
    const cells = this.getCellRange(bounds);
    const placement = this.placements.get(item);

    if (!placement) {
      const created: Placement<T> = { item, bounds, cells, lastSearch: 0 };
      this.placements.set(item, created);
      this.place(created);
      return;
    }

    placement.bounds = bounds;
    if (!isSameCellRange(placement.cells, cells)) {
      this.unplace(placement);
      placement.cells = cells;
      this.place(placement);
    }
  }

  delete(item: T) {
    const placement = this.placements.get(item);
    if (!placement) {
      return false;
    }
    this.unplace(placement);
    this.placements.delete(item);
    return true;
  }

  clear() {
    this.cells.clear();
    this.placements.clear();
    this.oversized.clear();
  }

  search(area: Bounds, visit: (item: T) => void) {
    for (const placement of this.oversized) {
      if (boundsIntersect(area, placement.bounds)) {
        visit(placement.item);
      }
    }

    const searchId = ++this.searchCount;
    const visitCell = (cell: Cell<T>) => {
      for (const placement of cell.placements) {
        if (placement.lastSearch !== searchId) {
          placement.lastSearch = searchId;
          if (boundsIntersect(area, placement.bounds)) {
            visit(placement.item);
          }
        }
      }
    };

    // min/max so that an inverted area still covers every candidate cell
    const probe = this.toCellRange([
      Math.min(area[0], area[2]),
      Math.min(area[1], area[3]),
      Math.max(area[0], area[2]),
      Math.max(area[1], area[3]),
    ]);

    // Probing cell by cell only pays off when the area spans fewer cells than
    // are occupied; NaN or far-out coordinates also take the scan below.
    if (isWithinCellKeyRange(probe) && cellCount(probe) <= this.cells.size) {
      for (let x = probe.minX; x <= probe.maxX; x++) {
        for (let y = probe.minY; y <= probe.maxY; y++) {
          const cell = this.cells.get(cellKey(x, y));
          if (cell) {
            visitCell(cell);
          }
        }
      }
      return;
    }

    for (const cell of this.cells.values()) {
      if (
        cell.x >= probe.minX &&
        cell.x <= probe.maxX &&
        cell.y >= probe.minY &&
        cell.y <= probe.maxY
      ) {
        visitCell(cell);
      }
    }
  }

  private toCellRange([x1, y1, x2, y2]: Bounds): CellRange {
    return {
      minX: Math.floor(x1 / this.cellSize),
      minY: Math.floor(y1 / this.cellSize),
      maxX: Math.floor(x2 / this.cellSize),
      maxY: Math.floor(y2 / this.cellSize),
    };
  }

  private getCellRange(bounds: Bounds): CellRange | null {
    const range = this.toCellRange(bounds);
    return isWithinCellKeyRange(range) && cellCount(range) <= MAX_CELLS_PER_ITEM
      ? range
      : null;
  }

  private place(placement: Placement<T>) {
    const { cells } = placement;
    if (!cells) {
      this.oversized.add(placement);
      return;
    }
    for (let x = cells.minX; x <= cells.maxX; x++) {
      for (let y = cells.minY; y <= cells.maxY; y++) {
        const key = cellKey(x, y);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = { x, y, placements: new Set() };
          this.cells.set(key, cell);
        }
        cell.placements.add(placement);
      }
    }
  }

  private unplace(placement: Placement<T>) {
    const { cells } = placement;
    if (!cells) {
      this.oversized.delete(placement);
      return;
    }
    for (let x = cells.minX; x <= cells.maxX; x++) {
      for (let y = cells.minY; y <= cells.maxY; y++) {
        const key = cellKey(x, y);
        const cell = this.cells.get(key);
        if (cell) {
          cell.placements.delete(placement);
          // Empty cells are dropped so `cells.size` stays the number of
          // occupied cells, which `search` uses to pick its strategy.
          if (cell.placements.size === 0) {
            this.cells.delete(key);
          }
        }
      }
    }
  }
}
