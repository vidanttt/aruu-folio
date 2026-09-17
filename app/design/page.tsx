import Footer from "../components/Footer";

export default function DesignPage() {
  const tiles = [
    { label: "3:4", col: "1 / 2", row: "1 / 49" },
    { label: "16:9", col: "2 / 4", row: "1 / 42" },
    { label: "4:3", col: "4 / 6", row: "1 / 55" },
    { label: "9:16", col: "1 / 2", row: "49 / 113" },
    { label: "3:4", col: "2 / 3", row: "42 / 90" },
    { label: "3:4", col: "3 / 4", row: "42 / 90" },
    { label: "16:9", col: "4 / 6", row: "55 / 96" },
  ];

  const mobileRatios = [
    "3/4",
    "16/9",
    "4/3",
    "9/16",
    "3/4",
    "3/4",
    "16/9",
  ];

  return (
    <div className="flex min-h-full flex-col justify-between bg-white">
      <div className="w-full flex-1">
        {/* Mobile */}
        <div className="flex flex-col md:hidden">
          {mobileRatios.map((ratio, i) => (
            <div
              key={i}
              className="box-border w-full border-b border-black bg-white"
              style={{ aspectRatio: ratio }}
            />
          ))}
        </div>

        {/* Desktop */}
        <div
          className="hidden box-border md:grid"
          style={{
            gridTemplateColumns: "repeat(5, 1fr)",
            gridAutoRows: "calc(100vw / 180)",
            borderTop: "1px solid #000",
            borderLeft: "1px solid #000",
          }}
        >
          {tiles.map((tile, i) => (
            <div
              key={i}
              className="box-border bg-white"
              style={{
                gridColumn: tile.col,
                gridRow: tile.row,
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
              }}
            />
          ))}
        </div>
      </div>

      <Footer borderTop={false} />
    </div>
  );
}