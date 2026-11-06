"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { InventoryCategory } from "@/lib/inventory/categories";
import { MAX_PRODUCT_BATCH_SIZE } from "@/lib/inventory/limits";
import { CategorySelect } from "./category-select";

export function BulkProductFields({ categories }: { categories: InventoryCategory[] }) {
  const [rows, setRows] = useState([0]);
  const nextId = useRef(1);
  const nameInputs = useRef(new Map<number, HTMLInputElement>());
  const focusRow = useRef<number | null>(null);
  function addRow() {
    const id = nextId.current++;
    focusRow.current = id;
    setRows([...rows, id]);
  }
  function removeRow(id: number, index: number) {
    nameInputs.current.get(rows[index > 0 ? index - 1 : 1])?.focus();
    setRows(rows.filter((row) => row !== id));
  }
  return <div className="stack">
    <CategorySelect categories={categories} label="Categoría para todos los productos" />
    <p className="field-hint">Cantidades en unidades. Aviso opcional: te avisamos cuando quede esa cantidad o menos.</p>
    <div className="batch-entry-list">
      <div className="batch-entry-row batch-entry-header" aria-hidden="true">
        <span className="text-center">Nombre</span>
        <span className="text-center"><span className="sm:hidden">Cant.</span><span className="hidden sm:inline">Cantidad</span></span>
        <span className="text-center"><span className="sm:hidden">Aviso</span><span className="hidden sm:inline">Avisar con</span></span>
      </div>
      {rows.map((id, index) => <fieldset key={id} className="batch-entry-row">
        <legend className="sr-only">Producto {index + 1}</legend>
        <input ref={(input) => {
          if (!input) { nameInputs.current.delete(id); return; }
          nameInputs.current.set(id, input);
          if (focusRow.current === id) { input.focus(); focusRow.current = null; }
        }} className="control min-w-0" aria-label={`Nombre del producto ${index + 1}`} name="names" required maxLength={160} />
        <input className="control batch-quantity" aria-label={`Cantidad del producto ${index + 1}`} name="quantities" inputMode="numeric" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={0} required />
        <input className="control batch-quantity" aria-label={`Avisar cuando queden, producto ${index + 1}`} name="thresholds" inputMode="numeric" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} />
        <button type="button" className="action-quiet action-icon" aria-label={`Quitar producto ${index + 1}`} disabled={rows.length === 1} onClick={() => removeRow(id, index)}><Icon name="trash" className="glyph-icon" /></button>
      </fieldset>)}
      <button type="button" className="action-quiet batch-entry-add" disabled={rows.length >= MAX_PRODUCT_BATCH_SIZE} onClick={addRow}><Icon name="plus" className="glyph-icon" />Agregar otro</button>
    </div>
    <p role="status" className="field-hint">{rows.length} de {MAX_PRODUCT_BATCH_SIZE} productos</p>
  </div>;
}
