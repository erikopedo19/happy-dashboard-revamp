"use client";

// Ported from beui.dev/components/motion/table — virtualized data table with
// sortable, resizable and reorderable columns and optional row selection.

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";
export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: string;
  label: ReactNode;
  /** Column width: '160px', '12rem', '1fr', '20%' or undefined for a share. */
  width?: string;
  align?: "left" | "center" | "right";
  /** Read the sortable/display value out of the row. Defaults to row[key]. */
  accessor?: (row: T) => string | number;
  /** Custom cell renderer — overrides accessor for display only. */
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
}

export interface BeuiTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  getRowId?: (row: T, index: number) => string;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  defaultSort?: SortState | null;
  resizable?: boolean;
  minColumnWidth?: number;
  reorderable?: boolean;
  rowHeight?: number;
  height?: number;
  overscan?: number;
  loading?: boolean;
  skeletonRows?: number;
  emptyState?: ReactNode;
  className?: string;
}

const CHECKBOX_WIDTH = 44;

function readCell<T>(row: T, column: TableColumn<T>): ReactNode {
  if (column.cell) return column.cell(row);
  const v = column.accessor
    ? column.accessor(row)
    : (row as Record<string, unknown>)[column.key];
  return v == null ? "" : (v as ReactNode);
}

function sortValue<T>(row: T, column: TableColumn<T>): string | number {
  if (column.accessor) return column.accessor(row);
  const v = (row as Record<string, unknown>)[column.key];
  if (typeof v === "number") return v;
  return String(v ?? "").toLowerCase();
}

/* ---------- column sorting ---------- */
function useColumnSort<T>(
  rows: { row: T; id: string }[],
  columns: TableColumn<T>[],
  defaultSort: SortState | null,
) {
  const [sort, setSort] = useState<SortState | null>(defaultSort);
  const toggleSort = useCallback((key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? prev.direction === "asc"
          ? { key, direction: "desc" }
          : null
        : { key, direction: "asc" },
    );
  }, []);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = sortValue(a.row, column);
      const vb = sortValue(b.row, column);
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }, [rows, columns, sort]);
  return { sort, sortedRows, toggleSort };
}

/* ---------- column resize ---------- */
function useColumnResize<T>(
  columns: TableColumn<T>[],
  minColumnWidth: number,
) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const dragRef = useRef<{ key: string; startX: number; startW: number } | null>(
    null,
  );

  const startResize = useCallback(
    (key: string, startX: number, startW: number) => {
      dragRef.current = { key, startX, startW };
      const onMove = (e: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        setWidths((w) => ({
          ...w,
          [d.key]: Math.max(minColumnWidth, d.startW + e.clientX - d.startX),
        }));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [minColumnWidth],
  );

  return { widths, startResize };
}

/* ---------- column reorder ---------- */
function useColumnReorder<T>(columns: TableColumn<T>[]) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

  const orderedColumns = useMemo(() => {
    if (!order) return columns;
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const ordered = order
      .map((k) => byKey.get(k))
      .filter(Boolean) as TableColumn<T>[];
    for (const c of columns) if (!order.includes(c.key)) ordered.push(c);
    return ordered;
  }, [columns, order]);

  const onDragStart = useCallback((key: string) => setDragKey(key), []);
  const onDragOver = useCallback(
    (targetKey: string) => {
      if (!dragKey || dragKey === targetKey) return;
      const keys = orderedColumns.map((c) => c.key);
      const next = keys.filter((k) => k !== dragKey);
      next.splice(next.indexOf(targetKey), 0, dragKey);
      setOrder(next);
    },
    [dragKey, orderedColumns],
  );
  const onDragEnd = useCallback(() => setDragKey(null), []);

  return { orderedColumns, dragKey, onDragStart, onDragOver, onDragEnd };
}

/* ---------- row selection ---------- */
function useRowSelection<T>(sortedRows: { row: T; id: string }[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = sortedRows.length > 0 && selected.size === sortedRows.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleRow = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    setSelected((s) =>
      s.size === sortedRows.length
        ? new Set()
        : new Set(sortedRows.map((r) => r.id)),
    );
  }, [sortedRows]);
  return { selected, allSelected, someSelected, toggleRow, toggleAll };
}

/* ---------- skeleton ---------- */
function SkeletonRows({
  count,
  columns,
  selectable,
  rowHeight,
}: {
  count: number;
  columns: number;
  selectable: boolean;
  rowHeight: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, r) => (
        <tr key={r} style={{ height: rowHeight }} className="border-b border-border/60">
          {selectable ? <td /> : null}
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c} className="px-4">
              <div className="h-3.5 animate-pulse rounded bg-muted/60" />
            </td>
          ))}
          <td />
        </tr>
      ))}
    </>
  );
}

export function BeuiTable<T>({
  data,
  columns,
  getRowId,
  selectable = false,
  onSelectionChange,
  defaultSort = null,
  resizable = false,
  minColumnWidth = 64,
  reorderable = false,
  rowHeight = 48,
  height = 440,
  overscan = 10,
  loading = false,
  skeletonRows = 3,
  emptyState = "No data",
  className,
}: BeuiTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const rows = useMemo(
    () =>
      data.map((row, index) => ({
        row,
        id: getRowId ? getRowId(row, index) : String(index),
      })),
    [data, getRowId],
  );

  const { sort, sortedRows, toggleSort } = useColumnSort(
    rows,
    columns,
    defaultSort,
  );
  const { widths, startResize } = useColumnResize(columns, minColumnWidth);
  const { orderedColumns, dragKey, onDragStart, onDragOver, onDragEnd } =
    useColumnReorder(columns);
  const { selected, allSelected, someSelected, toggleRow, toggleAll } =
    useRowSelection(sortedRows);

  const prevSelected = useRef<Set<string>>(new Set());
  if (onSelectionChange && selected !== prevSelected.current) {
    prevSelected.current = selected;
    onSelectionChange([...selected]);
  }

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  const leadColumns = orderedColumns.length + (selectable ? 1 : 0);

  return (
    <div
      className={cn(
        "w-full overflow-hidden border border-border bg-background text-sm",
        className,
      )}
    >
      <div ref={scrollRef} className="overflow-auto" style={{ height }}>
        <table
          className="w-full border-collapse"
          style={{ tableLayout: "fixed", minWidth: "100%" }}
        >
          <colgroup>
            {selectable ? <col style={{ width: CHECKBOX_WIDTH }} /> : null}
            {orderedColumns.map((column) => {
              const override = widths[column.key];
              const width = override ? `${override}px` : column.width;
              return (
                <col key={column.key} style={width ? { width } : undefined} />
              );
            })}
            <col />
          </colgroup>

          <thead className="sticky top-0 z-10 bg-inherit">
            <tr className="border-b border-border">
              {selectable ? (
                <th
                  className="px-0 py-0"
                  style={{ width: CHECKBOX_WIDTH }}
                >
                  <div className="flex h-full items-center justify-center">
                    <Checkbox
                      checked={
                        allSelected
                          ? true
                          : someSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </div>
                </th>
              ) : null}
              {orderedColumns.map((column) => {
                const sortable = column.sortable !== false;
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    ref={(el) => {
                      thRefs.current[column.key] = el;
                    }}
                    draggable={reorderable}
                    onDragStart={
                      reorderable ? () => onDragStart(column.key) : undefined
                    }
                    onDragOver={
                      reorderable
                        ? (e) => {
                            e.preventDefault();
                            onDragOver(column.key);
                          }
                        : undefined
                    }
                    onDragEnd={reorderable ? onDragEnd : undefined}
                    className={cn(
                      "group relative px-0 py-0 text-left align-middle",
                      dragKey === column.key && "opacity-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-full items-center gap-1.5 px-4 py-3",
                        column.align === "right" && "justify-end",
                        column.align === "center" && "justify-center",
                      )}
                    >
                      {reorderable ? (
                        <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground/40 group-hover:text-muted-foreground" />
                      ) : null}
                      <button
                        type="button"
                        disabled={!sortable}
                        onClick={sortable ? () => toggleSort(column.key) : undefined}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors",
                          sortable
                            ? "cursor-pointer text-muted-foreground hover:text-foreground"
                            : "cursor-default text-muted-foreground",
                          active && "text-foreground",
                        )}
                      >
                        {column.label}
                        {sortable ? (
                          active ? (
                            sort!.direction === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                          )
                        ) : null}
                      </button>
                    </div>
                    {resizable ? (
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          startResize(
                            column.key,
                            e.clientX,
                            thRefs.current[column.key]?.offsetWidth ??
                              minColumnWidth,
                          );
                        }}
                        className="absolute inset-y-0 right-0 w-2 cursor-col-resize"
                      />
                    ) : null}
                  </th>
                );
              })}
              <th className="px-4 py-3" aria-hidden />
            </tr>
          </thead>

          <tbody>
            {sortedRows.length === 0 ? (
              loading ? (
                <SkeletonRows
                  count={Math.max(1, Math.ceil(height / rowHeight))}
                  columns={orderedColumns.length}
                  selectable={selectable}
                  rowHeight={rowHeight}
                />
              ) : (
                <tr>
                  <td
                    colSpan={leadColumns + 1}
                    className="p-10 text-center text-muted-foreground"
                  >
                    {emptyState}
                  </td>
                </tr>
              )
            ) : (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden style={{ height: paddingTop }}>
                    <td colSpan={leadColumns + 1} />
                  </tr>
                ) : null}
                {virtualItems.map((vItem) => {
                  const entry = sortedRows[vItem.index];
                  const isSelected = selected.has(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      data-selected={isSelected}
                      style={{ height: rowHeight }}
                      className={cn(
                        "border-b border-border/60 transition-colors",
                        "data-[selected=true]:bg-muted/60 hover:bg-muted/50",
                      )}
                    >
                      {selectable ? (
                        <td className="text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(entry.id)}
                              aria-label={`Select row ${vItem.index + 1}`}
                            />
                          </div>
                        </td>
                      ) : null}
                      {orderedColumns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "truncate px-4 text-foreground",
                            column.align === "right" && "text-right",
                            column.align === "center" && "text-center",
                          )}
                        >
                          {readCell(entry.row, column)}
                        </td>
                      ))}
                      <td aria-hidden />
                    </tr>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr aria-hidden style={{ height: paddingBottom }}>
                    <td colSpan={leadColumns + 1} />
                  </tr>
                ) : null}
                {loading ? (
                  <SkeletonRows
                    count={skeletonRows}
                    columns={orderedColumns.length}
                    selectable={selectable}
                    rowHeight={rowHeight}
                  />
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
