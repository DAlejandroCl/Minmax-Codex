import { z } from "zod";

export const TALENT_COLUMNS = 4;
/** Puntos que hay que gastar en un árbol para desbloquear cada fila (la fila 0 está siempre abierta). */
export const POINTS_PER_ROW = 5;

export const TalentNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  row: z.number().int().min(0),
  col: z
    .number()
    .int()
    .min(0)
    .max(TALENT_COLUMNS - 1),
  maxRank: z.number().int().min(1).max(5),
  /** Prerrequisito: otro talento del mismo árbol que debe estar al máximo. */
  requires: z.string().min(1).optional(),
});
export type TalentNode = z.infer<typeof TalentNodeSchema>;

export const TalentTreeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    nodes: z.array(TalentNodeSchema).min(1),
  })
  .superRefine((tree, ctx) => {
    const ids = new Set<string>();
    const cells = new Set<string>();
    for (const n of tree.nodes) {
      if (ids.has(n.id)) ctx.addIssue({ code: "custom", message: `talento duplicado: ${n.id}` });
      ids.add(n.id);
      const cell = `${n.row}:${n.col}`;
      if (cells.has(cell)) ctx.addIssue({ code: "custom", message: `celda ocupada: ${cell}` });
      cells.add(cell);
    }
    for (const n of tree.nodes) {
      if (n.requires === undefined) continue;
      const req = tree.nodes.find((o) => o.id === n.requires);
      if (!req)
        ctx.addIssue({ code: "custom", message: `prerrequisito inexistente: ${n.requires}` });
      else if (req.row >= n.row)
        ctx.addIssue({ code: "custom", message: `${n.id} debe estar debajo de su prerrequisito` });
    }
  });
export type TalentTree = z.infer<typeof TalentTreeSchema>;

/** Puntos asignados por talento. Los talentos sin puntos no aparecen. */
export type TalentAllocation = Readonly<Record<string, number>>;

/** Puntos de talento disponibles a un nivel (el primero se obtiene al nivel 10). */
export const pointsAtLevel = (level: number): number => Math.max(0, level - 9);

export const rankOf = (alloc: TalentAllocation, id: string): number => alloc[id] ?? 0;

export const spentInTree = (tree: TalentTree, alloc: TalentAllocation): number =>
  tree.nodes.reduce((sum, n) => sum + rankOf(alloc, n.id), 0);

export const spentTotal = (trees: readonly TalentTree[], alloc: TalentAllocation): number =>
  trees.reduce((sum, t) => sum + spentInTree(t, alloc), 0);

/** Puntos que hacen falta en el árbol para abrir la fila del talento. */
export const requiredPointsForRow = (row: number): number => row * POINTS_PER_ROW;

const nodeOf = (tree: TalentTree, id: string): TalentNode | undefined =>
  tree.nodes.find((n) => n.id === id);

/** Puntos gastados en el árbol en filas estrictamente anteriores a `row`. */
const spentAbove = (tree: TalentTree, alloc: TalentAllocation, row: number): number =>
  tree.nodes.filter((n) => n.row < row).reduce((s, n) => s + rankOf(alloc, n.id), 0);

export type BlockReason =
  "max-rank" | "no-points" | "row-locked" | "prerequisite" | "dependency" | "row-support";

export function whyCannotIncrease(
  tree: TalentTree,
  alloc: TalentAllocation,
  id: string,
  pointsLeft: number,
): BlockReason | null {
  const node = nodeOf(tree, id);
  if (!node) return "max-rank";
  if (rankOf(alloc, id) >= node.maxRank) return "max-rank";
  if (pointsLeft <= 0) return "no-points";
  if (spentAbove(tree, alloc, node.row) < requiredPointsForRow(node.row)) return "row-locked";
  if (node.requires !== undefined) {
    const req = nodeOf(tree, node.requires);
    if (req && rankOf(alloc, req.id) < req.maxRank) return "prerequisite";
  }
  return null;
}

/** ¿Es válido el árbol tal como está? (filas abiertas, prerrequisitos al máximo, rangos). */
function treeIsValid(tree: TalentTree, alloc: TalentAllocation): boolean {
  for (const n of tree.nodes) {
    const r = rankOf(alloc, n.id);
    if (r === 0) continue;
    if (r > n.maxRank) return false;
    if (spentAbove(tree, alloc, n.row) < requiredPointsForRow(n.row)) return false;
    if (n.requires !== undefined) {
      const req = nodeOf(tree, n.requires);
      if (req && rankOf(alloc, req.id) < req.maxRank) return false;
    }
  }
  return true;
}

export function whyCannotDecrease(
  tree: TalentTree,
  alloc: TalentAllocation,
  id: string,
): BlockReason | null {
  if (rankOf(alloc, id) <= 0) return "max-rank";
  const next = { ...alloc, [id]: rankOf(alloc, id) - 1 };
  if (treeIsValid(tree, next)) return null;
  const node = nodeOf(tree, id);
  const dependent = tree.nodes.some((n) => n.requires === id && rankOf(alloc, n.id) > 0);
  return dependent && node ? "dependency" : "row-support";
}

const withRank = (alloc: TalentAllocation, id: string, rank: number): TalentAllocation => {
  const rest = Object.fromEntries(Object.entries(alloc).filter(([key]) => key !== id));
  return rank > 0 ? { ...rest, [id]: rank } : rest;
};

/** Suma un punto si las reglas lo permiten; si no, devuelve la misma asignación. */
export function increase(
  tree: TalentTree,
  alloc: TalentAllocation,
  id: string,
  pointsLeft: number,
): TalentAllocation {
  return whyCannotIncrease(tree, alloc, id, pointsLeft) === null
    ? withRank(alloc, id, rankOf(alloc, id) + 1)
    : alloc;
}

/** Quita un punto si no rompe filas ni prerrequisitos; si no, devuelve la misma asignación. */
export function decrease(tree: TalentTree, alloc: TalentAllocation, id: string): TalentAllocation {
  return whyCannotDecrease(tree, alloc, id) === null
    ? withRank(alloc, id, rankOf(alloc, id) - 1)
    : alloc;
}

export interface AllocationCheck {
  readonly valid: boolean;
  readonly spent: number;
  readonly unspent: number;
  readonly errors: readonly string[];
}

/** Valida una asignación completa (p. ej. importada) contra los árboles y el nivel. */
export function validateAllocation(
  trees: readonly TalentTree[],
  alloc: TalentAllocation,
  level: number,
): AllocationCheck {
  const errors: string[] = [];
  const known = new Set(trees.flatMap((t) => t.nodes.map((n) => n.id)));
  for (const id of Object.keys(alloc))
    if (!known.has(id)) errors.push(`talento desconocido: ${id}`);
  for (const t of trees)
    if (!treeIsValid(t, alloc)) errors.push(`asignación inválida en el árbol ${t.name}`);
  const spent = spentTotal(trees, alloc);
  const total = pointsAtLevel(level);
  if (spent > total)
    errors.push(`puntos gastados (${spent}) por encima de los disponibles (${total})`);
  return { valid: errors.length === 0, spent, unspent: Math.max(0, total - spent), errors };
}
