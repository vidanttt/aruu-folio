import Footer from "../components/Footer";

export default function VideoEditsPage() {
  /*
   * 5-column grid — 1 unit per column (each col = 20vw)
   * Row unit R = 100vw / 180  →  each col = 36 row-units wide
   *
   * Integer row-spans per tile:
   *   3:4  @ 1 col (36 ru wide)  →  36 × (4/3) = 48 rows
   *   9:16 @ 1 col (36 ru wide)  →  36 × (16/9) = 64 rows
   *   16:9 @ 2 cols (72 ru wide) →  72 × (9/16) = 40.5 ≈ 41 rows
   *   4:3  @ 2 cols (72 ru wide) →  72 × (3/4) = 54 rows
   *
   * Layout (col / row, 1-indexed):
   *  ┌─────┬──────────┬──────────┐
   *  │ 3:4 │  16:9    │  4:3     │  r1
   *  │     ├────┬─────┤          │
   *  │     │3:4 │ 3:4 ├──────────┤  r42 / r49
   *  ├─────┤    │     │  16:9    │
   *  │ 9:16│    │     │          │
   *  │     │    │     │          │
   *  └─────┴────┴─────┴──────────┘
   */

  const tiles = [
    { label: '3:4', col: '1 / 2', row: '1  / 49' },   // 48 rows ✓
    { label: '16:9', col: '2 / 4', row: '1  / 42' },   // 41 rows ≈
    { label: '4:3', col: '4 / 6', row: '1  / 55' },   // 54 rows ✓
    { label: '9:16', col: '1 / 2', row: '49 / 113' },  // 64 rows ✓
    { label: '3:4', col: '2 / 3', row: '42 / 90' },   // 48 rows ✓
    { label: '3:4', col: '3 / 4', row: '42 / 90' },   // 48 rows ✓
    { label: '16:9', col: '4 / 6', row: '55 / 96' },   // 41 rows ≈
  ];

  const mobileRatios = ['3/4', '16/9', '4/3', '9/16', '3/4', '3/4', '16/9'];

  return (
    <div className="flex flex-col min-h-full bg-background justify-between">
      <div className="w-full flex-1">
        {/* ── Mobile fallback: single column stack ── */}
        <div className="flex flex-col gap-px bg-foreground md:hidden">
          {mobileRatios.map((r, i) => (
            <div key={i} className="w-full bg-background" style={{ aspectRatio: r }} />
          ))}
        </div>

        {/* ── Desktop: 5-col interlocking grid ── */}
        <div
          className="hidden md:grid bg-foreground"
          style={{
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridAutoRows: 'calc(100vw / 180)',
            gap: '1px',
          }}
        >
          {tiles.map((t, i) => (
            <div
              key={i}
              className="bg-background"
              style={{ gridColumn: t.col, gridRow: t.row }}
            />
          ))}
        </div>
      </div>

      {/* Footer at end of page */}
      <Footer borderTop={false} />
    </div>
  );
}

