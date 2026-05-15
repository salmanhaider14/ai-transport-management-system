import { apiClient } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Text, TouchableOpacity, View } from "react-native";

export default function StudentProfileScreen() {
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.post("/auth/logout?useCookies=true", {});
            router.replace("/(auth)/login");
          } catch (error) {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* Header */}
      <View className="bg-green-600 px-6 pt-12 pb-6">
        <Text className="text-white text-2xl font-bold">Profile</Text>
        <Text className="text-green-100 mt-1">Student Account</Text>
      </View>

      <View className="p-4">
        {/* Student Info Placeholder */}
        <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <MaterialIcons name="person" size={24} color="#16a34a" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
              Account Information
            </Text>
          </View>
          <Text className="text-gray-500 dark:text-gray-400 text-sm">
            Student profile details will appear here after API integration
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="bg-red-500 rounded-xl py-3 mt-4"
          onPress={handleLogout}
        >
          <Text className="text-white text-center font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
