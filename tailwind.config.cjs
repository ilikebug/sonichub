/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // 启用基于 class 的深色模式
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './contexts/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
