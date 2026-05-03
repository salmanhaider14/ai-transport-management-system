import { useAppTheme } from "@/hooks/useAppTheme";
import { Text, TouchableOpacity, View } from "react-native";

export function ThemeSwitch() {
  const { colorScheme, mode, setTheme } = useAppTheme();

  return (
    <View className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
      <Text className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
        Theme Settings
      </Text>

      <View className="flex-row justify-around">
        <TouchableOpacity
          onPress={() => setTheme("light")}
          className={`px-4 py-2 rounded-lg ${mode === "light" ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
        >
          <Text
            className={
              mode === "light" ? "text-white" : "text-gray-900 dark:text-white"
            }
          >
            Light
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTheme("dark")}
          className={`px-4 py-2 rounded-lg ${mode === "dark" ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
        >
          <Text
            className={
              mode === "dark" ? "text-white" : "text-gray-900 dark:text-white"
            }
          >
            Dark
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTheme("system")}
          className={`px-4 py-2 rounded-lg ${mode === "system" ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
        >
          <Text
            className={
              mode === "system" ? "text-white" : "text-gray-900 dark:text-white"
            }
          >
            System
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
        Current: {colorScheme === "dark" ? "Dark Mode" : "Light Mode"}
      </Text>
    </View>
  );
}
