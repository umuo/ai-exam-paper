/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Songti SC"', '"SimSun"', '"Times New Roman"', 'serif'],
                sans: ['system-ui', 'sans-serif'],
            },
            screens: {
                'print': { 'raw': 'print' },
            },
        },
    },
    plugins: [],
};
