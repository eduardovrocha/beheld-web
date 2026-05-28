import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LocationPicker, formatLocation } from "./LocationPicker";
import type { PositionLocation } from "@/lib/companyDashboardApi";

// Controlled wrapper so the cascading selects react to onChange the same way
// they do inside the real form.
function setup(initial: PositionLocation = {}) {
  const onChange = vi.fn();
  function Wrapper() {
    const [val, setVal] = useState<PositionLocation>(initial);
    return <LocationPicker value={val} onChange={(l) => { onChange(l); setVal(l); }} />;
  }
  render(<Wrapper />);
  return { onChange, user: userEvent.setup() };
}

describe("LocationPicker", () => {
  it("começa só com o dropdown de região", () => {
    setup();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("selecionar Remote colapsa país/estado/cidade", async () => {
    const { onChange, user } = setup();
    await user.selectOptions(screen.getByRole("combobox"), "remote");
    expect(onChange).toHaveBeenCalledWith({ region: "remote" });
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("selecionar uma região exibe o dropdown de países", async () => {
    const { onChange, user } = setup();
    await user.selectOptions(screen.getByRole("combobox"), "south_america");
    expect(onChange).toHaveBeenCalledWith({ region: "south_america" });
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "Brasil" })).toBeInTheDocument();
  });

  it("país com múltiplos estados exibe o dropdown de estados", async () => {
    const { user } = setup();
    const [region] = screen.getAllByRole("combobox");
    await user.selectOptions(region, "south_america");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "BR");
    // region + country + state (Brasil tem MG e SP)
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "Minas Gerais" })).toBeInTheDocument();
  });

  it("país sem estados (1 estado) pula direto para cidade", async () => {
    const { onChange, user } = setup();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "asia");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "SG");
    // o estado único é auto-selecionado, sem renderizar dropdown de estado
    expect(onChange).toHaveBeenLastCalledWith({ region: "asia", country: "SG", state: "SG" });
    const boxes = screen.getAllByRole("combobox");
    expect(boxes).toHaveLength(3); // região + país + cidade (sem dropdown de estado)
    expect(within(boxes[2]).getByRole("option", { name: "Singapura" })).toBeInTheDocument();
  });

  it("trocar de região reseta país/estado/cidade", async () => {
    const { onChange, user } = setup();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "south_america");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "BR");
    onChange.mockClear();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "north_america");
    expect(onChange).toHaveBeenCalledWith({ region: "north_america" });
    // só região + país de novo (sem estado herdado)
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("emite a hierarquia completa ao selecionar cidade", async () => {
    const { onChange, user } = setup();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "south_america");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "BR");
    await user.selectOptions(screen.getAllByRole("combobox")[2], "MG");
    await user.selectOptions(screen.getAllByRole("combobox")[3], "Uberlândia");
    expect(onChange).toHaveBeenLastCalledWith({
      region: "south_america", country: "BR", state: "MG", city: "Uberlândia",
    });
  });
});

describe("formatLocation", () => {
  it("retorna — para vazio", () => {
    expect(formatLocation({})).toBe("—");
    expect(formatLocation(null)).toBe("—");
  });

  it("usa raw para rows legadas", () => {
    expect(formatLocation({ raw: "São Paulo" })).toBe("São Paulo");
  });

  it("formata Remote", () => {
    expect(formatLocation({ region: "remote" })).toBe("Remote");
  });

  it("formata a hierarquia resolvendo o label do país", () => {
    expect(formatLocation({ region: "south_america", country: "BR", state: "MG", city: "Uberlândia" }))
      .toBe("Uberlândia, MG — Brasil");
  });

  it("degrada para só o país quando não há cidade/estado", () => {
    expect(formatLocation({ region: "south_america", country: "BR" })).toBe("Brasil");
  });
});
