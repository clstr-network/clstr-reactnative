<!-- markdownlint-disable MD013 -->
# clstr

A modern React-based platform for connecting students and alumni through secure, purpose-driven interactions and AI-powered career guidance.

## ✨ Features

- **🏠 Home Feed** - Social media-style feed for alumni and student interactions
- **🌐 Network** - Connect with alumni and fellow students
- **👥 Mentorship** - Find mentors and mentees within your network
- **📅 Events** - Discover and attend alumni events
- **💬 Messaging** - Real-time communication with your connections
- **🎯 Clubs** - Join and participate in alumni clubs and groups
- **🤝 CollabHub** - Find teammates and collaborate on projects
- **🔍 Search** - Advanced search functionality across the platform
- **🌱 EcoCampus** - Environmental sustainability initiatives
- **🤖 AI Chatbot** - Intelligent assistant for career guidance
- **🎨 Portfolio** - Public portfolio pages with 4 customizable templates (Minimal, Eliana, Typefolio, Geeky)
- **📱 Mobile Responsive** - Optimized for all device sizes

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm
- Supabase account (for backend services)

### Installation

1. Clone the repository:

   ```bash
   git clone <YOUR_GIT_URL>
   cd pathway-partners
   ```

1. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

1. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Supabase credentials:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

1. Start the development server:

   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8080`.

## 🛠️ Technologies Used

This project is built with modern web technologies:

### Frontend

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React 18** - UI framework with latest features
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Framer Motion** - Animation library

### UI & Styling

- **shadcn/ui** - Modern, accessible UI components
- **Radix UI** - Unstyled, accessible UI primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### Backend & Database

- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Supabase Auth** - Authentication and user management
- **Supabase Storage** - File storage and management

### Development Tools

- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📁 Project Structure

```text
pathway-partners/
├── database/           # Database scripts and utilities
│   ├── scripts/       # Maintenance and cleanup scripts
│   └── README.md      # Database documentation
├── docs/              # Project documentation
│   └── TRUTH_MATRIX.md
├── src/               # Application source code
│   ├── components/    # Reusable React components
│   │   ├── ai/       # AI chatbot components
│   │   ├── ecocampus/ # EcoCampus feature components
│   │   ├── home/     # Home page components
│   │   ├── layout/   # Layout and navigation components
│   │   ├── mobile/   # Mobile-specific components
│   │   ├── profile/  # Profile-related components
│   │   │   └── portfolio/ # Portfolio templates (Minimal, Eliana, Typefolio, Geeky)
│   │   └── ui/       # shadcn/ui components
│   ├── contexts/     # React context providers
│   ├── hooks/        # Custom React hooks
│   ├── integrations/ # Third-party service integrations
│   │   └── supabase/ # Supabase client and types
│   ├── lib/          # Utility functions and API clients
│   ├── pages/        # Page components and routes
│   └── main.tsx      # Application entry point
├── supabase/         # Supabase configuration and migrations
│   ├── migrations/   # Database migrations
│   └── config.toml   # Supabase configuration
└── scripts/          # Build and deployment scripts
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Additional API keys for AI features
VITE_OPENAI_API_KEY=your_openai_api_key
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Netlify

1. Build the project:

   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to Netlify
3. Add environment variables in Netlify dashboard

### Manual Deployment

1. Build the project:

   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to any static hosting service

### Environment Variables for Production

Make sure to set these environment variables in your deployment platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Any additional API keys for AI features

## 🤝 Contributing

We welcome contributions to clstr! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit them: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Write meaningful commit messages
- Add tests for new features when applicable
- Update documentation as needed
- Ensure all linting checks pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page for existing solutions
2. Create a new issue with detailed information
3. Join our community discussions

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible components
- Powered by [Supabase](https://supabase.com/) for backend services
- Icons by [Lucide](https://lucide.dev/)
- Animations by [Framer Motion](https://www.framer.com/motion/)

---

Made with ❤️ for connecting alumni and students worldwide.
