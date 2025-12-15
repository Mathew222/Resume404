/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
        "./**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Courier Prime', 'monospace'],
                display: ['Archivo Black', 'sans-serif'],
                hand: ['Indie Flower', 'cursive'],
            },
            colors: {
                ink: '#121212',
                paper: '#f4f3ee',
                'paper-dark': '#e0ded5',
                alert: '#ff2a00',
                'alert-dark': '#cc0000',
            },
            boxShadow: {
                'hard': '5px 5px 0px 0px #121212',
                'hard-sm': '3px 3px 0px 0px #121212',
                'hard-lg': '8px 8px 0px 0px #121212',
                'hard-reverse': '-5px 5px 0px 0px #121212',
            },
            animation: {
                'marquee': 'marquee 20s linear infinite',
                'blink': 'blink 1s step-end infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                }
            }
        },
    },
    plugins: [],
}
