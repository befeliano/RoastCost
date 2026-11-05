import { createContext, useContext, type ComponentRef } from 'react';
import type { View } from 'react-native';

export type ViewNode = ComponentRef<typeof View>;

/** Screen provides this; a focused Field calls it so the keyboard never covers the input. */
export const RevealContext = createContext<((node: ViewNode | null) => void) | null>(null);
export const useReveal = () => useContext(RevealContext);
