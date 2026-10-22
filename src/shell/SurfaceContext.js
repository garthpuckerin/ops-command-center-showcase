// Screens that need to know the surface (the People record, the role-home
// desk CTAs) read it here instead of threading props through every screen.
import { createContext, useContext } from "react";

const SurfaceContext = createContext({ companion: false, tier: "workstation", deskAuthority: true });

export const SurfaceProvider = SurfaceContext.Provider;

export function useSurfaceInfo() {
  return useContext(SurfaceContext);
}
