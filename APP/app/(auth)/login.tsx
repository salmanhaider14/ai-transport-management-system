import { apiClient } from "@/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      // Login with cookie auth
      const res = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/login", { email, password });

      // Save token
      await AsyncStorage.setItem("accessToken", res.accessToken);

      // Get user info to determine role
      const userInfo = await apiClient.get<{ email: string; roles: string[] }>(
        "/auth/manage/info",
      );

      if (userInfo.roles.includes("Driver")) {
        router.replace("/driver" as any);
      } else if (userInfo.roles.includes("Student")) {
        router.replace("/student" as any);
      } else if (userInfo.roles.includes("Admin")) {
        router.replace("/driver" as any); // or /admin later
      } else {
        Alert.alert("Error", "No valid role assigned");
      }
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-black justify-center px-6">
      {/* Logo Area */}
      <View className="items-center mb-12">
        <View className="w-24 h-24 bg-green-600 rounded-full items-center justify-center mb-4">
          <Text className="text-white text-3xl font-bold">UOL</Text>
        </View>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          University of Lahore
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mt-1">
          Sargodha Campus
        </Text>
      </View>

      {/* Form */}
      <View className="space-y-4">
        <TextInput
          className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className="bg-green-600 rounded-xl py-3 mt-4"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-lg">
              Login
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dev Note */}
      <Text className="text-center text-gray-400 text-xs mt-8">
        Admin: admin@transport.local / Admin@123
      </Text>
    </View>
  );
}
