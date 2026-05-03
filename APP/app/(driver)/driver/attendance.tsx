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

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  remarks: string | null;
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
export default function DriverAttendanceScreen() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
  });

  const fetchAttendance = useCallback(async () => {
    try {
      const userInfo = await apiClient.get<{ userId: string }>(
        "/auth/manage/info",
      );

      // Get all drivers to find the numeric ID
      const drivers = await apiClient.get<DriverDetail[]>("/drivers");
      const currentDriver = drivers.find((d) => d.userId === userInfo.userId);
      if (currentDriver) {
        const driverId = currentDriver.id;
        // Get last 30 days attendance
        const today = new Date();
        const fromDate = new Date(today.setDate(today.getDate() - 30))
          .toISOString()
          .split("T")[0];
        const toDate = new Date().toISOString().split("T")[0];

        const data = await apiClient.get<AttendanceRecord[]>(
          `/attendance/driver/${driverId}?fromDate=${fromDate}&toDate=${toDate}`,
        );
        console.log("Attendances Data", data);
        setAttendances(data);

        // Calculate summary
        const summaryData = {
          present: data.filter((a) => a.status === "Present").length,
          late: data.filter((a) => a.status === "Late").length,
          absent: data.filter((a) => a.status === "Absent").length,
          onLeave: data.filter((a) => a.status === "OnLeave").length,
        };
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("Failed to fetch attendance", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "text-green-600";
      case "Late":
        return "text-yellow-600";
      case "Absent":
        return "text-red-600";
      case "OnLeave":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-green-100 dark:bg-green-900/30";
      case "Late":
        return "bg-yellow-100 dark:bg-yellow-900/30";
      case "Absent":
        return "bg-red-100 dark:bg-red-900/30";
      case "OnLeave":
        return "bg-blue-100 dark:bg-blue-900/30";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
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
        <Text className="text-white text-2xl font-bold">Attendance</Text>
        <Text className="text-green-100 mt-1">Last 30 days summary</Text>
      </View>

      {/* Summary Cards */}
      <View className="p-4">
        <View className="flex-row flex-wrap justify-between mb-4">
          <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 w-[48%] mb-2">
            <Text className="text-green-600 text-2xl font-bold">
              {summary.present}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              Present
            </Text>
          </View>
          <View className="bg-yellow-100 dark:bg-yellow-900/30 rounded-xl p-3 w-[48%] mb-2">
            <Text className="text-yellow-600 text-2xl font-bold">
              {summary.late}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              Late
            </Text>
          </View>
          <View className="bg-red-100 dark:bg-red-900/30 rounded-xl p-3 w-[48%]">
            <Text className="text-red-600 text-2xl font-bold">
              {summary.absent}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              Absent
            </Text>
          </View>
          <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 w-[48%]">
            <Text className="text-blue-600 text-2xl font-bold">
              {summary.onLeave}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              On Leave
            </Text>
          </View>
        </View>

        {/* Attendance List */}
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Attendance History
        </Text>

        {attendances.length === 0 ? (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 items-center">
            <MaterialIcons name="event-note" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 dark:text-gray-400 mt-2 text-center">
              No attendance records found
            </Text>
          </View>
        ) : (
          attendances.map((item) => (
            <View
              key={item.id}
              className={`${getStatusBg(item.status)} rounded-xl p-4 mb-3`}
            >
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    {new Date(item.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  {item.checkInTime && (
                    <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      Check In: {item.checkInTime.slice(0, 5)}
                    </Text>
                  )}
                  {item.checkOutTime && (
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">
                      Check Out: {item.checkOutTime.slice(0, 5)}
                    </Text>
                  )}
                  {item.remarks && (
                    <Text className="text-gray-400 text-xs mt-1 italic">
                      {item.remarks}
                    </Text>
                  )}
                </View>
                <Text
                  className={`font-semibold ${getStatusColor(item.status)}`}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
