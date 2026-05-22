import { BOARD } from "./constants";

export function getTile(x: number, y: number): string {
  if (y < 0 || y >= BOARD.length) return "#";

  const row = BOARD[y];
  if (x < 0 || x >= row.length) return "#";

  return row[x] ?? "#";
}

export function isWall(x: number, y: number): boolean {
  return getTile(x, y) === "#";
}

export function createPellets(): Record<string, boolean> {
  const pellets: Record<string, boolean> = {};

  for (let y = 0; y < BOARD.length; y++) {
    for (let x = 0; x < BOARD[y].length; x++) {
      if (BOARD[y][x] === ".") {
        pellets[`${x},${y}`] = true;
      }
    }
  }

  return pellets;
}

export function remainingPellets(pellets: Record<string, boolean>): number {
  return Object.values(pellets).filter(Boolean).length;
}
