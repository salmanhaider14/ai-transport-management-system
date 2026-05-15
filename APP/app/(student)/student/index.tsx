import { apiClient } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

interface ActiveBus {
  assignmentId: number;
  busId: number;
  busNumber: string;
  routeId: number;
  routeName: string;
  latitude: number;
  longitude: number;
  speedKph: number | null;
  lastUpdate: string;
  currentStatus: string;
}

const DEFAULT_LAT = 31.5097;
const DEFAULT_LNG = 72.6602;

export default function StudentTrackScreen() {
  const [buses, setBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedBus, setSelectedBus] = useState<ActiveBus | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const busImage = Asset.fromModule(require("@/assets/images/bus.png")).uri;
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: #ffffff;
    }

    #map {
      height: 100vh;
      width: 100vw;
    }

    .bus-marker {
  width: 65px;
  height: 65px;
  background-image: url('${busImage}');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
  </style>
</head>

<body>
  <div id="map"></div>

  <script>
    const map = L.map("map", {
      zoomControl: true,
    }).setView([${DEFAULT_LAT}, ${DEFAULT_LNG}], 14);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    let marker = null;

    const busIcon = L.divIcon({
  className: "",
  html: '<div class="bus-marker"></div>',
  iconSize: [70, 70],
  iconAnchor: [21, 21],
});

    function updateBus(bus) {
      if (!bus) return;

      const lat = bus.latitude || ${DEFAULT_LAT};
      const lng = bus.longitude || ${DEFAULT_LNG};

      const popupContent =
        "<b>" + bus.busNumber + "</b><br/>" +
        bus.routeName + "<br/>" +
        "Status: " + bus.currentStatus + "<br/>" +
        "Speed: " + (bus.speedKph ? Math.round(bus.speedKph) + " km/h" : "N/A");

      if (!marker) {
        marker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
      } else {
        marker.setLatLng([lat, lng]);
      }

      marker.bindPopup(popupContent);

      map.setView([lat, lng], 15, {
        animate: true,
        duration: 1
      });
    }
  </script>
</body>
</html>
`;

  const getLastUpdateText = (lastUpdate: string) => {
    const minutes = Math.floor(
      (Date.now() - new Date(lastUpdate).getTime()) / 60000,
    );

    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";

    return `${minutes} mins ago`;
  };

  const fetchActiveBuses = useCallback(async () => {
    try {
      const data = await apiClient.get<ActiveBus[]>("/locations/active");

      setBuses(data);

      // Update selected bus live
      if (selectedBus) {
        const updatedBus = data.find(
          (b) => b.assignmentId === selectedBus.assignmentId,
        );

        if (updatedBus) {
          setSelectedBus(updatedBus);

          if (showMapModal && webViewRef.current) {
            const jsCode = `
              updateBus(${JSON.stringify(updatedBus)});
              true;
            `;

            webViewRef.current.injectJavaScript(jsCode);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch active buses", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBus, showMapModal]);

  useEffect(() => {
    fetchActiveBuses();

    const interval = setInterval(fetchActiveBuses, 15000);

    return () => clearInterval(interval);
  }, [fetchActiveBuses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveBuses();
  };

  const openBusMap = (bus: ActiveBus) => {
    setSelectedBus(bus);
    setShowMapModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Trip":
      case "InProgress":
        return "text-green-600";

      case "Scheduled":
        return "text-blue-600";

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

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* Header */}
      <View className="bg-green-600 px-6 pt-12 pb-5">
        <Text className="text-white text-3xl font-bold">Track Buses</Text>

        <Text className="text-green-100 mt-1">
          {buses.length} active bus
          {buses.length !== 1 ? "es" : ""}
        </Text>
      </View>

      {/* Bus List */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {buses.length === 0 ? (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 items-center mt-4">
            <MaterialIcons name="directions-bus" size={56} color="#9CA3AF" />

            <Text className="text-gray-500 dark:text-gray-400 mt-3 text-center text-base">
              No active buses right now
            </Text>
          </View>
        ) : (
          buses.map((bus) => (
            <TouchableOpacity
              key={bus.assignmentId}
              activeOpacity={0.85}
              onPress={() => openBusMap(bus)}
              className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 mb-4"
            >
              {/* Top */}
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">
                    {bus.busNumber}
                  </Text>

                  <Text className="text-gray-600 dark:text-gray-400 mt-1">
                    {bus.routeName}
                  </Text>
                </View>

                <View className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full">
                  <Text
                    className={`font-semibold text-sm ${getStatusColor(bus.currentStatus)}`}
                  >
                    {bus.currentStatus}
                  </Text>
                </View>
              </View>

              {/* Bottom */}
              <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center">
                  <MaterialIcons name="schedule" size={16} color="#6B7280" />

                  <Text className="text-gray-500 dark:text-gray-400 ml-1">
                    {getLastUpdateText(bus.lastUpdate)}
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  {bus.speedKph && (
                    <View className="flex-row items-center">
                      <MaterialIcons name="speed" size={16} color="#6B7280" />

                      <Text className="text-gray-500 dark:text-gray-400 ml-1">
                        {Math.round(bus.speedKph)} km/h
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center">
                    <MaterialIcons name="map" size={18} color="#16a34a" />

                    <Text className="text-green-600 font-semibold ml-1">
                      Track
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* MAP MODAL */}
      <Modal visible={showMapModal} animationType="slide">
        <View className="flex-1 bg-white dark:bg-black">
          {/* Modal Header */}
          <View className="bg-green-600 px-5 pt-12 pb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-white text-2xl font-bold">
                {selectedBus?.busNumber}
              </Text>

              <Text className="text-green-100 mt-1">
                {selectedBus?.routeName}
              </Text>
            </View>

            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <MaterialIcons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Map */}
          <View className="flex-1">
            <WebView
              ref={webViewRef}
              source={{ html: mapHtml }}
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={() => {
                if (selectedBus && webViewRef.current) {
                  const jsCode = `
                    updateBus(${JSON.stringify(selectedBus)});
                    true;
                  `;

                  webViewRef.current.injectJavaScript(jsCode);
                }
              }}
            />
          </View>

          {/* Bottom Info */}
          {selectedBus && (
            <View className="bg-white dark:bg-gray-900 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-500 dark:text-gray-400">
                    Status
                  </Text>

                  <Text
                    className={`font-bold text-lg ${getStatusColor(selectedBus.currentStatus)}`}
                  >
                    {selectedBus.currentStatus}
                  </Text>
                </View>

                <View>
                  <Text className="text-gray-500 dark:text-gray-400">
                    Speed
                  </Text>

                  <Text className="text-gray-900 dark:text-white font-bold text-lg">
                    {selectedBus.speedKph
                      ? `${Math.round(selectedBus.speedKph)} km/h`
                      : "N/A"}
                  </Text>
                </View>

                <View>
                  <Text className="text-gray-500 dark:text-gray-400">
                    Updated
                  </Text>

                  <Text className="text-gray-900 dark:text-white font-bold">
                    {getLastUpdateText(selectedBus.lastUpdate)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
