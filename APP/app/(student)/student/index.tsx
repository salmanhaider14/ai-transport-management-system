import { apiClient } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

interface Assignment {
  id: number;
  busNumber: string;
  routeName: string;
  serviceDate: string;
  status: string;
  firstSlotStart: string;
  lastSlotEnd: string;
}

export default function StudentHomeScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const userInfo = await apiClient.get<{ email: string }>(
        "/auth/manage/info",
      );
      setUserName(userInfo.email.split("@")[0]);

      const today = new Date().toISOString().split("T")[0];
      const allAssignments = await apiClient.get<Assignment[]>(
        `/assignments?serviceDate=${today}`,
      );
      setAssignments(allAssignments.filter((a) => a.status !== "Cancelled"));
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View className="bg-green-600 px-6 pt-12 pb-6">
        <Text className="text-white text-2xl font-bold">
          Hello, {userName}!
        </Text>
        <Text className="text-green-100 mt-1">Welcome to Transport System</Text>
      </View>

      {/* Today's Buses */}
      <View className="p-4">
        <View className="flex-row items-center mb-4">
          <MaterialIcons name="directions-bus" size={24} color="#16a34a" />
          <Text className="text-xl font-semibold text-gray-900 dark:text-white ml-2">
            Today's Buses
          </Text>
        </View>

        {assignments.length === 0 ? (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 items-center">
            <MaterialIcons name="directions-bus" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 dark:text-gray-400 mt-2 text-center">
              No buses scheduled for today
            </Text>
          </View>
        ) : (
          assignments.map((item) => (
            <View
              key={item.id}
              className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {item.busNumber}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    {item.routeName}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center">
                  <MaterialIcons name="schedule" size={16} color="#6B7280" />
                  <Text className="text-gray-500 dark:text-gray-400 ml-1">
                    {item.firstSlotStart?.slice(0, 5)} -{" "}
                    {item.lastSlotEnd?.slice(0, 5)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
