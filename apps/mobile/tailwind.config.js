/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        primary: "#6C63FF",
        accent: "#00D2FF",
        success: "#00C896",
        error: "#FF4D6D",
      },
    },
  },
  plugins: [],
};
