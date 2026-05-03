import { useEffect, useState } from "react";
import { Appearance } from "react-native";

type ThemeMode = "light" | "dark" | "system";

export function useAppTheme() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [colorScheme, setColorScheme] = useState(
    Appearance.getColorScheme() || "light",
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(
      ({ colorScheme: newScheme }) => {
        if (mode === "system") {
          setColorScheme(newScheme || "light");
        }
      },
    );
    return () => subscription.remove();
  }, [mode]);

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    if (newMode === "system") {
      Appearance.setColorScheme(null);
      setColorScheme(Appearance.getColorScheme() || "light");
    } else {
      Appearance.setColorScheme(newMode);
      setColorScheme(newMode);
    }
  };

  return { colorScheme, mode, setTheme };
}
