/**
 * SubTabs — in-page view switcher under the page header. Items are
 * <button>s (v1 toggles section visibility rather than routing). Each
 * tab may carry a small count (`n`) that turns signal-ink when active.
 */
export interface SubTabDef<Id extends string> {
  id: Id;
  label: string;
  /** Small counter rendered after the label (e.g. "0", "1/5"). */
  n?: string | null;
}

export function SubTabs<Id extends string>({ tabs, active, onSelect, big = false }: {
  tabs: readonly SubTabDef<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
  /** `.tabs--big` modifier — prominent count chips (company dashboard). */
  big?: boolean;
}) {
  return (
    <nav className={`tabs${big ? " tabs--big" : ""}`}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button"
                className={tab.id === active ? "active" : undefined}
                aria-current={tab.id === active ? "true" : undefined}
                onClick={() => onSelect(tab.id)}>
          {tab.label}
          {tab.n != null && <span className="n">{tab.n}</span>}
        </button>
      ))}
    </nav>
  );
}
