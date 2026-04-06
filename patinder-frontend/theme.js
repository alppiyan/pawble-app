tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] },
            colors: { 
                primary: '#FF6584', 
                secondary: '#38B2AC', 
                dark: '#2D3748', 
                surface: '#F7FAFC', 
                'dark-surface': '#1A202C', 
                'dark-card': '#2D3748' 
            },
            boxShadow: { 
                'soft': '0 10px 40px -10px rgba(0,0,0,0.08)', 
                'glow': '0 0 20px rgba(255, 101, 132, 0.5)' 
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'slide-up': 'slideUp 0.5s ease-out forwards'
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        }
    }
}