import { apiClient } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
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
  timeSlots?: Array<{
    slotNumber: number;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}
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

export default function DriverScheduleScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      // Option 1: If you have the driver ID from profile (after fixing profile page)
      // You could store the driverProfileId in AsyncStorage after login

      // Option 2: Get all drivers and find by userId (temporary workaround)
      const userInfo = await apiClient.get<{
        userId: string;
        email: string;
        roles: string[];
      }>("/auth/manage/info");

      // Get all drivers to find the numeric ID
      const drivers = await apiClient.get<DriverDetail[]>("/drivers");
      const currentDriver = drivers.find((d) => d.userId === userInfo.userId);

      if (currentDriver) {
        const driverProfileId = currentDriver.id; // This is the integer ID!

        const allAssignments = await apiClient.get<Assignment[]>(
          `/assignments?driverId=${driverProfileId}`,
        );
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const upcomingAssignments = allAssignments.filter((assignment) => {
          const assignmentDate = new Date(assignment.serviceDate);
          return assignmentDate >= today && assignmentDate <= nextWeek;
        });

        setAssignments(upcomingAssignments);
      }
    } catch (error) {
      console.error("Failed to fetch schedule", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const viewAssignmentDetails = async (assignment: Assignment) => {
    try {
      const fullAssignment = await apiClient.get<Assignment>(
        `/assignments/${assignment.id}`,
      );
      setSelectedAssignment(fullAssignment);
    } catch (error) {
      console.error("Failed to fetch assignment details", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-600";
      case "InProgress":
        return "text-yellow-600";
      case "Scheduled":
        return "text-blue-600";
      case "Cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
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
        <Text className="text-white text-2xl font-bold">Schedule</Text>
        <Text className="text-green-100 mt-1">Next 7 days assignments</Text>
      </View>

      {/* Schedule List */}
      <View className="p-4">
        {assignments.length === 0 ? (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 items-center">
            <MaterialIcons name="calendar-today" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 dark:text-gray-400 mt-2 text-center">
              No upcoming assignments found
            </Text>
          </View>
        ) : (
          assignments.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => viewAssignmentDetails(item)}
              className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(item.serviceDate)}
                  </Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {item.busNumber}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    {item.routeName}
                  </Text>
                </View>
                <Text
                  className={`font-semibold ${getStatusColor(item.status)}`}
                >
                  {item.status}
                </Text>
              </View>
              <View className="flex-row items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <MaterialIcons name="schedule" size={16} color="#6B7280" />
                <Text className="text-gray-500 dark:text-gray-400 ml-1">
                  {item.firstSlotStart?.slice(0, 5)} -{" "}
                  {item.lastSlotEnd?.slice(0, 5)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Assignment Details Modal (inline for demo) */}
      {selectedAssignment && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center px-4">
          <View className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Assignment Details
              </Text>
              <TouchableOpacity onPress={() => setSelectedAssignment(null)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 dark:text-gray-400">
              Bus: {selectedAssignment.busNumber}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 mt-1">
              Route: {selectedAssignment.routeName}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 mt-1">
              Date:{" "}
              {new Date(selectedAssignment.serviceDate).toLocaleDateString()}
            </Text>

            <Text className="font-semibold mt-4 text-gray-900 dark:text-white">
              Time Slots:
            </Text>
            {selectedAssignment.timeSlots?.map((slot) => (
              <View
                key={slot.slotNumber}
                className="flex-row justify-between mt-2"
              >
                <Text className="text-gray-600 dark:text-gray-400">
                  Slot {slot.slotNumber}:
                </Text>
                <Text className="text-gray-600 dark:text-gray-400">
                  {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                </Text>
                <Text className={`text-sm ${getStatusColor(slot.status)}`}>
                  {slot.status}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              className="bg-green-600 rounded-xl py-3 mt-6"
              onPress={() => setSelectedAssignment(null)}
            >
              <Text className="text-white text-center font-semibold">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
