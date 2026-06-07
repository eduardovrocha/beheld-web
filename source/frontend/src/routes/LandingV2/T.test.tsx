/**
 * T — parser de markup inline do copy da landing (tags <sig>, <hl>,
 * <ok>, <warn>, <dim>, <strong>, <count>, <br/>; entidades viram texto).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseInline } from "./T";

function html(input: string): string {
  const { container } = render(<>{parseInline(input)}</>);
  return container.innerHTML;
}

describe("parseInline", () => {
  it("maps the standard tags to their elements/classes", () => {
    expect(html("a <sig>b</sig> c")).toBe('a <span class="sig">b</span> c');
    expect(html("<strong>x</strong>")).toBe("<b>x</b>");
    expect(html("<hl>4.2×</hl>")).toBe('<span class="h">4.2×</span>');
    expect(html("<dim>y</dim>")).toBe('<span class="dim">y</span>');
    expect(html("<ok>Confirmado.</ok>")).toBe('<span class="pin-ok">Confirmado.</span>');
    expect(html("<warn>Limitado.</warn>")).toBe('<span class="pin-warn">Limitado.</span>');
    expect(html("<count>2.417</count>")).toBe("<b>2.417</b>");
  });

  it("renders <br/> as a line break", () => {
    expect(html("a<br/>b")).toBe("a<br>b");
  });

  it("decodes entities and leaves unknown markup as literal text", () => {
    expect(html("Substituídos por <hl>[path:&lt;hash 8 chars&gt;]</hl>")).toBe(
      'Substituídos por <span class="h">[path:&lt;hash 8 chars&gt;]</span>',
    );
  });

  it("survives malformed markup (unclosed/orphan tags)", () => {
    expect(html("a <sig>b")).toBe("a b");
    expect(html("a</sig> b")).toBe("a b");
  });
});
