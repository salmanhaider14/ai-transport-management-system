import { ThemeSwitch } from "@/components/ThemeSwitch";
import { Text, View } from "react-native";

export default function DevScreen() {
  return (
    <View className="flex-1 p-4 bg-white dark:bg-black">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Dev Panel
      </Text>
      <ThemeSwitch />
    </View>
  );
}
