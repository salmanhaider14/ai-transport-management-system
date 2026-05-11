import { apiClient } from "@/api/client";
import * as Location from "expo-location";
import { AppState, AppStateStatus } from "react-native";

let locationSubscription: Location.LocationSubscription | null = null;
let trackingActive = false;
let currentAssignmentId: number | null = null;

export interface TrackingConfig {
  assignmentId: number;
  intervalSeconds?: number;
  onError?: (error: string) => void;
}

export const startLocationTracking = async (config: TrackingConfig) => {
  const { assignmentId, intervalSeconds = 15, onError } = config;

  // Request permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    onError?.("Location permission denied");
    return false;
  }

  // Stop any existing tracking
  await stopLocationTracking();

  currentAssignmentId = assignmentId;
  trackingActive = true;

  // Start watching position
  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: intervalSeconds * 1000,
      distanceInterval: 10, // Send every 10 meters
    },
    async (location) => {
      if (!trackingActive) return;

      try {
        await apiClient.post("/locations", {
          busAssignmentId: assignmentId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speedKph: location.coords.speed ? location.coords.speed * 3.6 : null,
          heading: location.coords.heading,
          accuracy: location.coords.accuracy,
        });
      } catch (error) {
        console.error("Failed to send location:", error);
      }
    },
  );

  // Handle app state changes (pause tracking when app in background)
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (!trackingActive) return;

    if (nextAppState === "background") {
      // Option: Send "paused" status or continue based on requirements
      console.log("App in background, continuing tracking");
    }
  };

  const subscription = AppState.addEventListener(
    "change",
    handleAppStateChange,
  );

  return true;
};

export const stopLocationTracking = async () => {
  trackingActive = false;
  currentAssignmentId = null;

  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
};

export const isTrackingActive = () => trackingActive;
export const getCurrentAssignmentId = () => currentAssignmentId;
