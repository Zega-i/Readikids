/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  corePlugins: { preflight: true },
  theme: {
    extend: {
      fontFamily: {
        nunito: ['"Nunito"', 'sans-serif'],
      }
    }
  },
  plugins: [],
};
