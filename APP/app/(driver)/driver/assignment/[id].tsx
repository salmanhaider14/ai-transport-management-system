import { apiClient } from "@/api/client";
import {
  isTrackingActive,
  startLocationTracking,
  stopLocationTracking,
} from "@/api/locationService";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TimeSlot {
  id: number;
  slotNumber: number;
  startTime: string;
  endTime: string;
  status: string;
  actualStartTime?: string;
  actualEndTime?: string;
  notes?: string;
}

interface Assignment {
  id: number;
  busId: number;
  busNumber: string;
  routeId: number;
  routeName: string;
  driverProfileId: number;
  driverName: string;
  serviceDate: string;
  status: string;
  firstSlotStart?: string;
  lastSlotEnd?: string;
  totalSlots: number;
  completedSlots: number;
  timeSlots: TimeSlot[];
}

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [driverProfileId, setDriverProfileId] = useState<number | null>(null);

  const fetchDriverProfile = useCallback(async () => {
    try {
      const userInfo = await apiClient.get<{
        userId: string;
        email: string;
        roles: string[];
      }>("/auth/manage/info");
      const drivers =
        await apiClient.get<{ id: number; userId: string }[]>("/drivers");
      const currentDriver = drivers.find((d) => d.userId === userInfo.userId);
      if (currentDriver) {
        setDriverProfileId(currentDriver.id);
      }
    } catch (error) {
      console.error("Failed to fetch driver profile", error);
    }
  }, []);

  const fetchAssignment = useCallback(async () => {
    try {
      const data = await apiClient.get<Assignment>(`/assignments/${id}`);
      setAssignment(data);
    } catch (error) {
      console.error("Failed to fetch assignment", error);
      Alert.alert("Error", "Failed to load assignment details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDriverProfile();
    fetchAssignment();
    setTracking(isTrackingActive());
  }, [fetchAssignment]);

  const handleStartTrip = async () => {
    if (!assignment) return;

    setUpdatingStatus(true);
    try {
      await apiClient.put(`/assignments/${assignment.id}`, {
        status: "InProgress",
      });
      await startLocationTracking({
        assignmentId: assignment.id,
        intervalSeconds: 15,
        onError: (error) => Alert.alert("Location Error", error),
      });
      setTracking(true);
      fetchAssignment();
      Alert.alert("Success", "Trip started. Location tracking is active.");
    } catch (error) {
      Alert.alert("Error", "Failed to start trip");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEndTrip = async () => {
    if (!assignment) return;

    Alert.alert("End Trip", "Are you sure you want to end this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Trip",
        style: "destructive",
        onPress: async () => {
          setUpdatingStatus(true);
          try {
            await stopLocationTracking();
            await apiClient.put(`/assignments/${assignment.id}`, {
              status: "Completed",
            });
            setTracking(false);
            fetchAssignment();
            Alert.alert("Success", "Trip ended. Thank you for your service!");
            router.back();
          } catch (error) {
            Alert.alert("Error", "Failed to end trip");
          } finally {
            setUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  const handleUpdateSlotStatus = async (slotId: number, status: string) => {
    try {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      await apiClient.put(`/assignments/${assignment?.id}/slots/${slotId}`, {
        status: status,
        actualStartTime: status === "InProgress" ? now : undefined,
        actualEndTime: status === "Completed" ? now : undefined,
      });
      fetchAssignment();
    } catch (error) {
      Alert.alert("Error", "Failed to update slot status");
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-gray-500 dark:text-gray-400">
          Assignment not found
        </Text>
      </View>
    );
  }

  const canStartTrip = assignment.status === "Scheduled";
  const canEndTrip =
    assignment.status === "InProgress" ||
    assignment.status === "PartiallyCompleted";

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      <View className="bg-green-600 px-6 pt-12 pb-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">
          {assignment.busNumber}
        </Text>
        <Text className="text-green-100 mt-1">{assignment.routeName}</Text>
      </View>

      <View className="p-4">
        <View className="flex-row gap-4 mb-6">
          {canStartTrip && (
            <TouchableOpacity
              className="flex-1 bg-green-600 rounded-xl py-3"
              onPress={handleStartTrip}
              disabled={updatingStatus}
            >
              <Text className="text-white text-center font-semibold">
                {updatingStatus ? "Starting..." : "Start Trip"}
              </Text>
            </TouchableOpacity>
          )}
          {canEndTrip && (
            <TouchableOpacity
              className="flex-1 bg-red-500 rounded-xl py-3"
              onPress={handleEndTrip}
              disabled={updatingStatus}
            >
              <Text className="text-white text-center font-semibold">
                {updatingStatus ? "Ending..." : "End Trip"}
              </Text>
            </TouchableOpacity>
          )}
          {tracking && (
            <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-600 text-sm">Tracking</Text>
            </View>
          )}
        </View>

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Time Slots
        </Text>

        {assignment.timeSlots.map((slot) => {
          const isCurrentSlot =
            slot.slotNumber ===
            (assignment?.timeSlots.find((s) => s.status === "InProgress")
              ?.slotNumber || 1);

          const isNextSlot =
            slot.status === "Scheduled" &&
            (!assignment?.timeSlots.find((s) => s.status === "InProgress") ||
              slot.slotNumber ===
                (assignment?.timeSlots.find((s) => s.status === "InProgress")
                  ?.slotNumber ?? 0) +
                  1);
          return (
            <View
              key={slot.id}
              className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    Slot {slot.slotNumber}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                  </Text>
                  {slot.actualStartTime && (
                    <Text className="text-green-600 text-sm mt-1">
                      Started: {slot.actualStartTime.slice(0, 5)}
                    </Text>
                  )}
                  {slot.actualEndTime && (
                    <Text className="text-green-600 text-sm">
                      Ended: {slot.actualEndTime.slice(0, 5)}
                    </Text>
                  )}
                </View>
                <Text
                  className={`font-semibold ${getStatusColor(slot.status)}`}
                >
                  {slot.status}
                </Text>
              </View>

              {tracking && (isCurrentSlot || isNextSlot) && (
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <TouchableOpacity
                    className="flex-1 bg-yellow-500 rounded-lg py-2"
                    onPress={() =>
                      handleUpdateSlotStatus(slot.id, "InProgress")
                    }
                  >
                    <Text className="text-white text-center text-sm">
                      Start Slot
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-green-600 rounded-lg py-2"
                    onPress={() => handleUpdateSlotStatus(slot.id, "Completed")}
                  >
                    <Text className="text-white text-center text-sm">
                      Complete Slot
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
