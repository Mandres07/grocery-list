import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountForm } from "@/components/auth/account-form";
import { ActionForm } from "@/components/ui/action-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";

const action = async () => ({ success: true, message: "Guardado" });
const hasFormCard = (html: string) => /<form[^>]*class="[^"]*surface-raised/.test(html);

describe("shared form surfaces", () => {
  it("gives account data-entry forms the shared card surface", () => {
    const html = renderToStaticMarkup(createElement(AccountForm, { action, submitLabel: "Guardar", fields: [{ name: "name", label: "Nombre", autoComplete: "name" }] }));
    expect(hasFormCard(html)).toBe(true);
  });
  it("gives standalone inventory forms the same surface", () => {
    const html = renderToStaticMarkup(createElement(ActionForm, { action, requestId: "test-request", submitLabel: "Guardar" }, createElement(FormField, { name: "name", label: "Nombre" })));
    expect(hasFormCard(html)).toBe(true);
  });
  it("uses the modal card without nesting another form card", () => {
    const html = renderToStaticMarkup(createElement(FormDialog, { action, hiddenFields: {}, title: "Crear", triggerLabel: "Crear", submitLabel: "Guardar" }, createElement(FormField, { name: "name", label: "Nombre" })));
    expect(html).toContain('class="modal-surface"');
    expect(hasFormCard(html)).toBe(false);
    expect(html).toContain('method="post"');
  });
  it("places the floating close action inside the native dialog", () => {
    const html = renderToStaticMarkup(createElement(FormDialog, { action, hiddenFields: {}, title: "Agregar producto", triggerLabel: "Agregar producto", submitLabel: "Guardar", floating: true }));
    expect(html).toContain('aria-haspopup="dialog" aria-expanded="false"');
    expect(html.split("<dialog")[0]).toContain('aria-label="Agregar producto"');
    expect(html.split("<dialog")[1]).toContain('aria-label="Cerrar formulario"');
    expect(html.match(/aria-label="Agregar producto"/g)).toHaveLength(1);
    expect(html).not.toMatch(/<dialog[^>]*\bopen[ =>]/);
  });
  it("keeps ordinary edit dialogs free of floating close actions", () => {
    const html = renderToStaticMarkup(createElement(FormDialog, { action, hiddenFields: {}, title: "Editar", triggerLabel: "Editar", submitLabel: "Guardar" }));
    expect(html).not.toContain('aria-label="Cerrar formulario"');
    expect(html).toContain('aria-label="Cerrar ventana"');
  });

});
