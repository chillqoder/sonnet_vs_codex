function FilterTabs({ label, options, selected, onChange }) {
  return (
    <section className="filter-group">
      <p className="filter-label">{label}</p>
      <div className="chip-row" role="tablist" aria-label={label}>
        {options.map((option) => {
          const active = selected === option;

          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "chip active" : "chip"}
              onClick={() => onChange(active ? "" : option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default FilterTabs;
