# Refyn - AI-Powered Creative Feedback Platform

## Overview

Refyn is a full-stack web application that provides AI-powered feedback for creative professionals and hobbyists. The platform allows users to upload various types of creative work (photography, paintings, music, films, etc.) and receive personalized AI feedback to refine their artistic vision. The application features subscription-based access with different tiers, cultural discovery tools, note-taking capabilities, and micro-course generation from user feedback history.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration (cream background, yellow/teal/burgundy brand colors)
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **File Upload**: React Dropzone for drag-and-drop file uploads

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: OpenID Connect (OIDC) with Replit authentication
- **Session Management**: Express sessions with PostgreSQL store
- **File Storage**: Replit Object Storage for file uploads

## Key Components

### Authentication & User Management
- OIDC-based authentication through Replit
- User profiles with customizable interests and artist statements
- Session-based authentication with PostgreSQL session storage
- User subscription management with Stripe integration

### AI Feedback System
- Specialized AI tutors for different creative mediums (photography, painting, music, film, etc.)
- Context-aware prompts based on media type and user-provided context
- Support for multiple AI providers (OpenAI, Google Generative AI, Anthropic)
- Conversation-based feedback system with message history

### File Management
- Support for multiple file types (images, audio, video, PDFs)
- Replit Object Storage integration for file uploads
- File comparison features for before/after analysis
- AI-generated descriptive titles for uploaded files

### Subscription System
- Stripe integration for payment processing
- Multiple subscription tiers (free, standard, premium, academic)
- Usage tracking with monthly conversation limits
- Subscription status monitoring and management

### Cultural Discovery
- Google Maps integration for discovering cultural locations
- AI-generated location recommendations based on user interests
- Favorite locations management
- Search and filtering capabilities for cultural venues

### Note-Taking & Learning
- AI-powered note extraction from feedback conversations
- Manual note creation and organization
- Categorized notes (technique, advice, resource)
- Micro-course generation from accumulated notes

## Data Flow

1. **User Authentication**: Users authenticate via Replit OIDC, creating or updating user records
2. **File Upload**: Files are uploaded to Replit Object Storage with metadata stored in PostgreSQL
3. **AI Feedback**: Context and files are sent to AI providers, with responses stored as conversation messages
4. **Note Extraction**: AI responses are analyzed to extract valuable insights as notes
5. **Cultural Discovery**: Location data is fetched from external APIs and stored for user recommendations
6. **Subscription Management**: Stripe webhooks update user subscription status and usage tracking

## External Dependencies

### AI Services
- OpenAI GPT models for general feedback and note extraction
- Google Generative AI for additional AI capabilities
- Anthropic Claude for specialized feedback scenarios

### Payment Processing
- Stripe for subscription management and payment processing
- Webhook handling for real-time subscription updates

### Maps & Location Services
- Google Maps JavaScript API for cultural discovery features
- Google Places API for location data enrichment

### Storage & Database
- Neon Database (PostgreSQL) for primary data storage
- Replit Object Storage for file uploads and media storage

### Authentication
- Replit OIDC provider for user authentication
- Express sessions with connect-pg-simple for session persistence

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:
- **Development**: `npm run dev` starts both frontend and backend in development mode
- **Production Build**: `npm run build` creates optimized builds for both client and server
- **Production Runtime**: `npm run start` serves the built application
- **Database Migrations**: Drizzle Kit handles schema migrations with `npm run db:push`

### Environment Configuration
- PostgreSQL database connection via `DATABASE_URL`
- Session security via `SESSION_SECRET`
- AI service API keys for OpenAI, Google, and Anthropic
- Stripe configuration for payment processing
- Google Maps API key for location services

### Replit-Specific Features
- Object Storage integration for file handling
- Postgres module for database services
- Development tooling with hot reload and error overlays
- Automatic port forwarding and SSL certificates

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 18, 2025. Initial setup
- June 20, 2025. Added conversation deletion functionality with confirmation dialog and complete cleanup of associated files from object storage
- July 2, 2025. Implemented mobile-responsive UI with sticky header and footer navigation. Updated logo to new design. Added mobile layout component with proper navigation icons (list-restart, map-pin, circle-plus, book-open, graduation-cap). Fixed authentication for development environment. Integrated mobile layout across all main pages (Home, Notes, Micro-courses, Cultural Discovery).
- July 4, 2025. Replaced Replit OIDC authentication with custom email/password and Google OAuth system. Added secure password hashing, session management, new authentication page with mobile-responsive design, proper form validation, and database schema updates for authentication fields.
- July 4, 2025. Redesigned app with GiffGaff-inspired bold color scheme featuring striking yellow (#F5A623) primary, vibrant pink (#E91E63) secondary, and dark navigation bars. Updated mobile layout, feature cards, authentication page, and subscription components with modern gradient styling and rounded corners.
- July 4, 2025. Fixed security vulnerability CVE-2025-30208 by upgrading Vite from 5.4.14 to 5.4.15. Also resolved development-specific file upload issue caused by Button component form submission conflicts by replacing the Button with a styled div element, preventing page refreshes during file uploads in development mode.
- July 5, 2025. Implemented Progressive Web App (PWA) functionality. Added web app manifest, service worker for caching, PWA meta tags, app icons, and install button component. App is now installable on mobile devices and desktop browsers with offline capabilities and native app-like experience. Updated app icon to use green Refyn PNG logos with proper branding. Fixed PWA install button visibility with fallback display and orange styling to match app theme.
- July 5, 2025. Updated subscription pricing tiers: Free (5 conversations, 5 files per conversation, 30mb max, 3 replies, 2 improved versions), Standard (15 conversations, 10 files per conversation, 80mb max, 8 replies, 5 improved versions), Premium (40 conversations, 15 files per conversation, 100mb max, 15 replies, 10 improved versions). Fixed upgrade button processing state to only show 'Processing...' on the specific button clicked, not both buttons simultaneously.