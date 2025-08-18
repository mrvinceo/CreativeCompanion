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
- July 6, 2025. Redesigned micro-course creation to use Google Gemini AI locally instead of external webhook service. Implemented comprehensive course structure with 1-3 parts per course, each containing: detailed teaching content, AI-generated illustrations, multiple choice quizzes (1-4 questions per part), and scoring system. Added final assignment requiring artwork creation. Created interactive course viewer with quiz functionality, progress tracking, and structured navigation between parts. Updated database schema to support new course structure with parts, quizzes, and assignments.
- July 6, 2025. Enhanced quiz system with less strict requirements: lowered pass threshold to 50% (from 100%), added persistent quiz result storage in localStorage so users don't need to retake quizzes, implemented retake functionality for each quiz, added clear pass/fail status indicators with color-coded navigation, and made assignment submission conditional on passing all quizzes. Added informational messaging about quiz requirements and progress tracking for locked assignments.
- July 7, 2025. Fixed critical authentication infinite loop issue affecting both login and logout flows. Root cause was queryClient throwing errors on 401 responses instead of treating them as expected behavior for unauthenticated users. Resolved by: updating useAuth hook to use proper query function that returns null on 401, disabling aggressive refetching, improving logout endpoint to properly destroy sessions and clear cookies, updating logout button to use POST endpoint with proper cache clearing, and adding comprehensive error handling. Authentication flow now works smoothly without repeated user deserialization commands or loading loops.
- July 7, 2025. Fixed blank screen issues on landing page by implementing comprehensive error handling and timeout protection. Added 3-second loading timeout, Error Boundary component for React crash recovery, defensive routing logic that always renders content, and improved loading UI with clear messaging. Landing page now shows consistently without blank screens even during authentication state transitions or errors.
- July 8, 2025. Resolved authentication state loss during scrolling by removing timeout logic that was incorrectly reverting users to splash screen. Extended authentication cache time to 5 minutes for better stability. Fixed landing page content duplication by removing wildcard fallback routes that were causing double rendering in wouter Switch component. Authentication now persists properly during page interactions and landing page displays correctly without content repetition.
- July 16, 2025. Implemented Google Imagen 3 API integration for micro-course image generation. Updated generateCourseImage function to use gemini-2.0-flash-preview-image-generation model with proper multimodal response handling. Added comprehensive error handling with fallback to enhanced SVG placeholders featuring professional educational styling. Course images are now generated based on AI-created prompts specific to each course part's content.
- July 19, 2025. Fixed critical deployment error caused by incorrect 'Modality' import from '@google/generative-ai' package. The package doesn't export 'Modality' as a named export. Removed the incorrect import and replaced Modality.TEXT and Modality.IMAGE with string literals "TEXT" and "IMAGE" in the multimodal generation configuration. Application now builds and deploys successfully without import errors.
- August 13, 2025. Enhanced Cultural Discovery with comprehensive events integration. Added Events tab with Gemini AI search grounding to discover cultural events based on user interests and location. Implemented favorite events functionality with database schema (favoriteEvents table), API endpoints, and UI components. Events can now be favorited/unfavorited with heart buttons and displayed in dedicated Favorite Events tab. Enhanced media preview component with full audio/video playback support including HTML5 players with controls for MP3, WAV, MP4, MOV formats. Updated database schema and storage interface for events favoriting with proper CRUD operations.
- August 13, 2025. Added comprehensive legal documentation integration to splash page, registration page, and authentication page. Created reusable LegalFooter component linking to all legal documents (Privacy Policy, Terms of Service, Cookie Policy, Data Retention Schedule, Legal Notice, Accessibility Statement). Added terms acceptance notices to registration forms with direct links to Terms of Service and Privacy Policy. All legal documents are now accessible via footer links with external link indicators for user transparency and compliance.
- August 18, 2025. Fixed Cultural Discovery favorites functionality and improved map event handling. Favorites now correctly display in locations tab by checking stored data rather than just current search results. Events without accurate location coordinates are now excluded from map view to prevent misleading approximate locations. Added comprehensive event detail modal with venue, date, organizer, and favorite functionality. Map displays different colored markers for locations (category-based) vs events (red markers), with proper info windows showing relevant details for each type.