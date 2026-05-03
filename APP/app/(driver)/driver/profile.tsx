import { apiClient } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DriverDetail {
  id: number;
  email: string;
  userName: string;
  licenseNumber: string;
  phoneNumber: string;
  address?: string;
  nationalId?: string;
  emergencyContact?: string;
  dateOfJoining: string;
  isActive: boolean;
  userId: string;
}

export default function DriverProfileScreen() {
  const [profile, setProfile] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // app/(driver)/driver/profile.tsx
  const fetchProfile = useCallback(async () => {
    try {
      // 1. Get user info with UserId
      const userInfo = await apiClient.get<{
        userId: string;
        email: string;
        roles: string[];
      }>("/auth/manage/info");

      // 2. Get all drivers and find by UserId
      const drivers = await apiClient.get<DriverDetail[]>("/drivers");
      console.log("Drivers", drivers);
      const currentDriver = drivers.find((d) => d.userId === userInfo.userId);
      console.log("Current Driver", currentDriver);
      if (currentDriver) {
        setProfile(currentDriver);
      } else {
        Alert.alert("Error", "Driver profile not found");
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      {/* Header */}
      <View className="bg-green-600 px-6 pt-12 pb-6">
        <Text className="text-white text-2xl font-bold">Profile</Text>
        <Text className="text-green-100 mt-1">Driver Account</Text>
      </View>

      {/* Profile Info */}
      <View className="p-4">
        {/* Driver Details Card */}
        <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <MaterialIcons name="person" size={24} color="#16a34a" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
              Personal Information
            </Text>
          </View>

          <View className="space-y-3">
            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Name
              </Text>
              <Text className="text-gray-900 dark:text-white font-medium">
                {profile?.userName || "N/A"}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Email
              </Text>
              <Text className="text-gray-900 dark:text-white font-medium">
                {profile?.email || "N/A"}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                License Number
              </Text>
              <Text className="text-gray-900 dark:text-white font-medium">
                {profile?.licenseNumber || "N/A"}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Phone Number
              </Text>

              <Text className="text-gray-900 dark:text-white font-medium">
                {profile?.phoneNumber || "N/A"}
              </Text>
            </View>
            {profile?.address && (
              <View>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Address
                </Text>
                <Text className="text-gray-900 dark:text-white font-medium">
                  {profile.address}
                </Text>
              </View>
            )}
            {profile?.emergencyContact && (
              <View>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Emergency Contact
                </Text>
                <Text className="text-gray-900 dark:text-white font-medium">
                  {profile.emergencyContact}
                </Text>
              </View>
            )}

            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Date of Joining
              </Text>
              <Text className="text-gray-900 dark:text-white font-medium">
                {profile?.dateOfJoining
                  ? new Date(profile.dateOfJoining).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Status
              </Text>
              <View className="flex-row items-center mt-1">
                <View
                  className={`w-2 h-2 rounded-full ${profile?.isActive ? "bg-green-500" : "bg-red-500"} mr-2`}
                />
                <Text className="text-gray-900 dark:text-white font-medium">
                  {profile?.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="bg-red-500 rounded-xl py-3 mt-4"
          onPress={handleLogout}
        >
          <Text className="text-white text-center font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
