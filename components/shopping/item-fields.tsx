"use client";

import { useId, useRef, useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { searchShoppingProducts } from "@/app/(account)/shopping/actions";

type ProductOption = { id: string; name: string; unit: string };

export function ShoppingItemFields({ householdId, products }: { householdId: string; products: ProductOption[] }) {
  const id = useId();
  const [options, setOptions] = useState(products);
  const [choice, setChoice] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const busy = useRef(false);
  async function search() {
    if (busy.current) return;
    busy.current = true;
    setSearching(true);
    try {
      const result = await searchShoppingProducts(householdId, query);
      if (!result.message) {
        setOptions((current) => {
          const selected = current.find((product) => product.id === choice);
          return selected && !result.products.some((product) => product.id === choice) ? [selected, ...result.products] : result.products;
        });
      }
      setMessage(result.message || (result.products.length ? `${result.products.length} ${result.products.length === 1 ? "producto disponible" : "productos disponibles"}. Selecciona uno abajo.` : "No encontramos productos. Puedes agregar un artículo personalizado."));
    } catch { setMessage("No pudimos buscar. Intenta de nuevo."); }
    finally { busy.current = false; setSearching(false); }
  }
  return <>
    <div><label htmlFor={`${id}-search`} className="field-label">Buscar en tu inventario (opcional)</label><div className="flex gap-2"><input id={`${id}-search`} className="control min-w-0" type="search" maxLength={160} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} placeholder="Nombre del producto" /><button type="button" className="action-secondary" disabled={searching} onClick={search}>{searching ? "Buscando…" : "Buscar"}</button></div><p className="field-hint" role="status">{message}</p></div>
    <div><label htmlFor={`${id}-product`} className="field-label">Artículo</label><select id={`${id}-product`} className="control" name="productId" value={choice} onChange={(event) => setChoice(event.target.value)}><option value="">Artículo personalizado</option>{options.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.unit}</option>)}</select></div>
    {!choice && <><FormField name="name" label="Nombre del artículo" required maxLength={160} /><FormField name="unit" label="Unidad" required maxLength={60} defaultValue="unidades" /><p className="field-hint">Los artículos personalizados no modifican el inventario. Elige un producto existente si quieres actualizar sus existencias al recibirlo.</p></>}
    <FormField name="quantity" label="Cantidad por comprar" type="number" required min={1} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={1} />
    {choice && <p className="field-hint">Si ya está pendiente o comprado, conservaremos ese artículo y su cantidad.</p>}
  </>;
}
