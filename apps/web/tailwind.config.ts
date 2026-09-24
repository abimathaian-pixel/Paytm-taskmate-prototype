import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paytm: {
          blue: "#002970",
          lightBlue: "#00b9f5",
          darkBlue: "#0f4a8a",
          sky: "#e8f7fd",
          gray: "#f5f7fa",
          border: "#e2e8f0",
          success: "#00b374",
          warning: "#ff9800",
          danger: "#f44336",
        },
      },
    },
  },
  plugins: [],
};
export default config;
