import { apiClient } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChatBot({ visible, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI transport assistant. Ask me about bus schedules, routes, or live bus locations.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const response = await apiClient.post<{ reply: string }>("/chat", {
        message: userMessage.text,
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-black">
        {/* Header */}
        <View className="bg-green-600 pt-12 pb-4 px-5 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">AI Assistant</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4 py-4"
          renderItem={({ item }) => (
            <View
              className={`mb-3 max-w-[85%] ${item.isUser ? "self-end" : "self-start"}`}
            >
              <View
                className={`rounded-2xl px-4 py-2 ${
                  item.isUser ? "bg-green-600" : "bg-gray-200 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={`text-base ${
                    item.isUser ? "text-white" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {item.text}
                </Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1 mx-2">
                {formatTime(item.timestamp)}
              </Text>
            </View>
          )}
          ListFooterComponent={
            loading ? (
              <View className="self-start mb-3">
                <View className="bg-gray-200 dark:bg-gray-800 rounded-2xl px-4 py-3">
                  <ActivityIndicator size="small" color="#16a34a" />
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View className="flex-row items-center p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <TextInput
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Ask about buses, schedules..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
              className="ml-2 w-12 h-12 bg-green-600 rounded-full items-center justify-center"
            >
              <MaterialIcons
                name="send"
                size={22}
                color={!inputText.trim() || loading ? "#94a3b8" : "white"}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
