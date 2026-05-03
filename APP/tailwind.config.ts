/** @type {import('tailwindcss').Config} */
module.exports = {
  // Add paths to all of your component files
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", // New Expo Router directory
    "./src/**/*.{js,jsx,ts,tsx}", // Optional src directory
    "./components/**/*.{js,jsx,ts,tsx}", // Global components
  ],
  presets: [require("nativewind/preset")], // Essential for Expo/React Native
  theme: {
    extend: {},
  },
  plugins: [],
};
