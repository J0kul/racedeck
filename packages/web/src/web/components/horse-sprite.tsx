import { spriteHue } from "../lib/game";

export function HorseSprite({
  color,
  turtled,
  size = 54,
  running,
}: {
  color: string;
  turtled?: boolean;
  size?: number;
  running?: boolean;
}) {
  const src = turtled ? "/sprites/turtle.png" : "/sprites/horse_mint.png";
  return (
    <img
      src={src}
      alt={turtled ? "turtle" : "horse"}
      className="pixelated select-none"
      draggable={false}
      style={{
        height: size,
        width: "auto",
        filter: turtled
          ? "drop-shadow(0 3px 0 rgba(0,0,0,.5))"
          : `hue-rotate(${spriteHue(color)}deg) saturate(1.15) drop-shadow(0 3px 0 rgba(0,0,0,.5))`,
        animation: running ? "floaty 0.5s ease-in-out infinite" : undefined,
      }}
    />
  );
}
