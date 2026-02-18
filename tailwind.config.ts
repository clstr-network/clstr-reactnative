
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '1rem',
				md: '1.5rem',
				lg: '2rem',
			},
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			'xs': '475px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
		},
		extend: {
			spacing: {
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-top': 'env(safe-area-inset-top)',
			},
			minHeight: {
				'touch': '44px',
				'touch-lg': '48px',
			},
			minWidth: {
				'touch': '44px',
				'touch-lg': '48px',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				alumni: {
					primary: '#3b82f6',
					secondary: '#8b5cf6',
					accent: '#6366f1',
					muted: '#f3f4f6',
					background: '#ffffff',
					card: '#f9fafb',
				},
				// Admin panel light theme colors
				admin: {
					// Backgrounds
					'bg': {
						DEFAULT: '#f9fafb',      // gray-50
						elevated: '#ffffff',      // white
						muted: '#f3f4f6',        // gray-100
						subtle: '#e5e7eb',       // gray-200
					},
					// Text/Ink colors
					'ink': {
						DEFAULT: '#111827',      // gray-900
						secondary: '#374151',    // gray-700
						muted: '#6b7280',        // gray-500
					},
					// Border colors
					'border': {
						DEFAULT: '#e5e7eb',      // gray-200
						strong: '#d1d5db',       // gray-300
					},
					// Primary accent
					'primary': {
						DEFAULT: '#8b5cf6',      // violet-500
						light: '#ede9fe',        // violet-100
					},
					// Status colors
					'success': {
						DEFAULT: '#10b981',      // emerald-500
						light: '#d1fae5',        // emerald-100
					},
					'error': {
						DEFAULT: '#ef4444',      // red-500
						light: '#fee2e2',        // red-100
					},
					'warning': {
						DEFAULT: '#f59e0b',      // amber-500
						light: '#fef3c7',        // amber-100
					},
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-out': {
					from: { opacity: '1' },
					to: { opacity: '0' }
				},
				'slide-up': {
					from: { transform: 'translateY(100%)' },
					to: { transform: 'translateY(0)' }
				},
				'slide-down': {
					from: { transform: 'translateY(-100%)' },
					to: { transform: 'translateY(0)' }
				},
				'slide-in': {
					from: { transform: 'translateY(10px)', opacity: '0' },
					to: { transform: 'translateY(0)', opacity: '1' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'slide-up': 'slide-up 0.3s ease-out',
				'slide-down': 'slide-down 0.3s ease-out',
				'slide-in': 'slide-in 0.4s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
