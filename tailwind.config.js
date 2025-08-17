module.exports = {
  content: ["./pages/*.{html,js}", "./index.html", "./js/*.js"],
  theme: {
    extend: {
      colors: {
        // Primary Colors - Deep Portuguese blue
        primary: {
          50: "#EBF2F8", // primary-50
          100: "#D7E5F1", // primary-100
          200: "#AFCBE3", // primary-200
          300: "#87B1D5", // primary-300
          400: "#5F97C7", // primary-400
          500: "#377DB9", // primary-500
          600: "#2F6394", // primary-600
          700: "#1B4B73", // primary-700 (main)
          800: "#163C5C", // primary-800
          900: "#112D45", // primary-900
          DEFAULT: "#1B4B73", // primary
        },
        // Secondary Colors - Warm terracotta
        secondary: {
          50: "#FBF6F3", // secondary-50
          100: "#F7EDE7", // secondary-100
          200: "#EFDCCF", // secondary-200
          300: "#E7CAB7", // secondary-300
          400: "#DFB89F", // secondary-400
          500: "#D7A687", // secondary-500
          600: "#C9946F", // secondary-600
          700: "#C17B5A", // secondary-700 (main)
          800: "#9A6248", // secondary-800
          900: "#734936", // secondary-900
          DEFAULT: "#C17B5A", // secondary
        },
        // Accent Colors - Golden warmth
        accent: {
          50: "#FCF9F5", // accent-50
          100: "#F9F3EB", // accent-100
          200: "#F3E7D7", // accent-200
          300: "#EDDBC3", // accent-300
          400: "#E7CFAF", // accent-400
          500: "#E1C39B", // accent-500
          600: "#DBB787", // accent-600
          700: "#D4A574", // accent-700 (main)
          800: "#B8915F", // accent-800
          900: "#9C7D4A", // accent-900
          DEFAULT: "#D4A574", // accent
        },
        // Background Colors
        background: "#FDFCFA", // warm-white
        surface: "#F7F5F2", // subtle-cream
        // Text Colors
        text: {
          primary: "#2C3E50", // rich-charcoal
          secondary: "#6B7280", // balanced-gray
        },
        // Status Colors
        success: {
          50: "#ECFDF5", // success-50
          100: "#D1FAE5", // success-100
          200: "#A7F3D0", // success-200
          300: "#6EE7B7", // success-300
          400: "#34D399", // success-400
          500: "#10B981", // success-500
          600: "#059669", // success-600 (main)
          700: "#047857", // success-700
          800: "#065F46", // success-800
          900: "#064E3B", // success-900
          DEFAULT: "#059669", // success
        },
        warning: {
          50: "#FFFBEB", // warning-50
          100: "#FEF3C7", // warning-100
          200: "#FDE68A", // warning-200
          300: "#FCD34D", // warning-300
          400: "#FBBF24", // warning-400
          500: "#F59E0B", // warning-500
          600: "#D97706", // warning-600 (main)
          700: "#B45309", // warning-700
          800: "#92400E", // warning-800
          900: "#78350F", // warning-900
          DEFAULT: "#D97706", // warning
        },
        error: {
          50: "#FEF2F2", // error-50
          100: "#FEE2E2", // error-100
          200: "#FECACA", // error-200
          300: "#FCA5A5", // error-300
          400: "#F87171", // error-400
          500: "#EF4444", // error-500
          600: "#DC2626", // error-600 (main)
          700: "#B91C1C", // error-700
          800: "#991B1B", // error-800
          900: "#7F1D1D", // error-900
          DEFAULT: "#DC2626", // error
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        accent: ['Crimson Text', 'serif'],
        playfair: ['Playfair Display', 'serif'],
        inter: ['Inter', 'sans-serif'],
        crimson: ['Crimson Text', 'serif'],
      },
      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading': ['2rem', { lineHeight: '1.3' }],
        'subheading': ['1.5rem', { lineHeight: '1.4' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'small': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'subtle': '0 4px 12px rgba(27, 75, 115, 0.08)',
        'elevated': '0 8px 24px rgba(27, 75, 115, 0.12)',
        'cultural': '0 6px 20px rgba(27, 75, 115, 0.10)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        'gentle-bounce': 'gentleBounce 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gentleBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      transitionDuration: {
        '300': '300ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'smooth': 'ease-out',
        'cultural': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}