import { apiClient } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface RouteStop {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}

interface Route {
  id: number;
  name: string;
  isActive: boolean;
  stops?: RouteStop[];
}

export default function StudentRoutesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const fetchRoutes = useCallback(async () => {
    try {
      const data = await apiClient.get<Route[]>("/routes");
      setRoutes(data.filter((r) => r.isActive));
    } catch (error) {
      console.error("Failed to fetch routes", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
  };

  const viewRouteDetails = async (route: Route) => {
    try {
      const fullRoute = await apiClient.get<Route>(`/routes/${route.id}`);
      setSelectedRoute(fullRoute);
    } catch (error) {
      console.error("Failed to fetch route details", error);
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
        <Text className="text-white text-2xl font-bold">Routes</Text>
        <Text className="text-green-100 mt-1">
          {routes.length} active route{routes.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Routes List */}
      <View className="p-4">
        {routes.length === 0 ? (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 items-center">
            <MaterialIcons name="directions-bus" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 dark:text-gray-400 mt-2 text-center">
              No routes available
            </Text>
          </View>
        ) : (
          routes.map((route) => (
            <TouchableOpacity
              key={route.id}
              onPress={() => viewRouteDetails(route)}
              className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {route.name}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {route.stops?.length || 0} stops
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Route Details Modal */}
      <Modal visible={!!selectedRoute} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedRoute?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedRoute(null)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 dark:text-gray-400 mb-3">
              Stops ({selectedRoute?.stops?.length || 0})
            </Text>

            <ScrollView className="max-h-96">
              {selectedRoute?.stops
                ?.sort((a, b) => a.stopOrder - b.stopOrder)
                .map((stop, index) => (
                  <View key={stop.id} className="flex-row items-start mb-4">
                    <View className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mr-3">
                      <Text className="text-green-600 font-bold">
                        {stop.stopOrder}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 dark:text-white font-semibold">
                        {stop.name}
                      </Text>
                      <Text className="text-gray-500 dark:text-gray-400 text-xs">
                        Lat: {stop.latitude.toFixed(4)}, Lng:{" "}
                        {stop.longitude.toFixed(4)}
                      </Text>
                    </View>
                    {index < (selectedRoute.stops?.length || 0) - 1 && (
                      <MaterialIcons
                        name="arrow-downward"
                        size={20}
                        color="#9CA3AF"
                      />
                    )}
                  </View>
                ))}
            </ScrollView>

            <TouchableOpacity
              className="bg-green-600 rounded-xl py-3 mt-4"
              onPress={() => setSelectedRoute(null)}
            >
              <Text className="text-white text-center font-semibold">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
