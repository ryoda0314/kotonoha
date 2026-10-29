import { useEffect, useState } from "react";
import { staticFile, useDelayRender } from "remotion";

// The app's paper, ink and one accent (../src/app/globals.css). Violet is for what comes back.
export const C = {
  paper: "#fcfbf8",
  surface: "#f1f4f8",
  ink: "#172033",
  ink2: "#3b4558",
  muted: "#5c6578",
  faint: "#8c94a5",
  line: "#e4e7ec",
  line2: "#d4d9e1",
  accent: "#0a64f0",
  tint: "#e6f0ff",
  again: "#6a4fe0",
  againTint: "#efebff",
} as const;

export const FONT = {
  ui: `"Plex", "PlexJP", sans-serif`,
  ja: `"PlexJP", sans-serif`,
  en: `"Plex", sans-serif`,
  mincho: `"Shippori", serif`,
} as const;

// The app's type, from the files `npm run assets` puts in public/fonts.
const FACES: [family: string, file: string, weight: string][] = [
  ["Plex", "fonts/IBMPlexSans.ttf", "100 700"],
  ["PlexJP", "fonts/IBMPlexSansJP-Regular.ttf", "400"],
  ["PlexJP", "fonts/IBMPlexSansJP-Medium.ttf", "500"],
  ["PlexJP", "fonts/IBMPlexSansJP-SemiBold.ttf", "600"],
  ["Shippori", "fonts/ShipporiMincho-Bold.ttf", "700"],
];

let loading: Promise<unknown> | null = null;

/**
 * Holds every frame until the type has loaded. Asked from the film's root component, not at a module's top level:
 * remotion/no-react empties the list of waits when it loads, and a wait made before that was never let go, so the
 * render stopped at its time limit (and frames could be taken before the type arrived).
 */
export function useFonts() {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loading ??= Promise.all(
      FACES.map(([family, file, weight]) => {
        const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
        document.fonts.add(face);
        return face.load();
      }),
    );
    loading.then(() => continueRender(handle), cancelRender);
  }, [handle, continueRender, cancelRender]);
}
