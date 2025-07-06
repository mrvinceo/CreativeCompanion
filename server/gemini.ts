import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface CoursePart {
  title: string;
  content: string;
  imagePrompt: string;
  imageUrl?: string;
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
}

export interface GeneratedCourse {
  parts: CoursePart[];
  finalAssignment: {
    title: string;
    description: string;
    artworkPrompt: string;
  };
}

export async function generateMicroCourse(
  courseTitle: string,
  selectedNotes: Array<{ title: string; content: string }>
): Promise<GeneratedCourse> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const notesText = selectedNotes.map(note => 
    `${note.title}: ${note.content}`
  ).join('\n\n');

  const prompt = `Create a comprehensive micro-course with the title: "${courseTitle}"

Based on these notes and topics:
${notesText}

Generate a course with 1-3 parts that covers the essential concepts. For each part, provide:

1. A clear title
2. Comprehensive teaching content (300-500 words) that explains the concepts, includes practical applications, and suggests areas for further research
3. A descriptive prompt for generating an illustration image that relates to the content
4. A multiple choice quiz with 1-4 questions testing understanding of the content

After all parts, create one final assignment that:
- Consolidates learning across all parts
- Requires the student to create new artwork
- Provides clear instructions and goals

Format your response as valid JSON with this structure:
{
  "parts": [
    {
      "title": "Part title",
      "content": "Detailed teaching content...",
      "imagePrompt": "Description for image generation...",
      "quiz": [
        {
          "question": "Quiz question?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0
        }
      ]
    }
  ],
  "finalAssignment": {
    "title": "Assignment title",
    "description": "Detailed assignment description...",
    "artworkPrompt": "Specific artwork creation prompt..."
  }
}

Ensure all content is educational, practical, and encourages creative growth. The course should be engaging and actionable for creative professionals.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }
    
    const courseData = JSON.parse(jsonMatch[0]);
    
    // Validate the structure
    if (!courseData.parts || !Array.isArray(courseData.parts) || courseData.parts.length === 0) {
      throw new Error("Invalid course structure: missing parts");
    }
    
    if (!courseData.finalAssignment) {
      throw new Error("Invalid course structure: missing final assignment");
    }
    
    return courseData as GeneratedCourse;
  } catch (error) {
    console.error("Gemini course generation error:", error);
    throw new Error(`Failed to generate course: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function generateCourseImage(imagePrompt: string): Promise<string> {
  try {
    // Use Google's Imagen 3 through Gemini 2.0 Flash with image generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `Create a high-quality educational illustration: ${imagePrompt}. Make it visually appealing, professional, and suitable for learning materials.` }] 
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const response = await result.response;
    console.log('Gemini image generation response received');
    
    // Note: Google's Imagen 3 integration through Gemini API is still in preview
    // For now, we'll use enhanced placeholder SVGs with more detailed visuals
    return `data:image/svg+xml;base64,${Buffer.from(createPlaceholderSVG(imagePrompt)).toString('base64')}`;
  } catch (error) {
    console.error("Image generation error:", error);
    return `data:image/svg+xml;base64,${Buffer.from(createPlaceholderSVG(imagePrompt)).toString('base64')}`;
  }
}

function createPlaceholderSVG(prompt: string): string {
  const themes = [
    { bg: '#F5A623', accent: '#FFF3E0', icon: '🎨' },
    { bg: '#E91E63', accent: '#FCE4EC', icon: '📚' },
    { bg: '#2196F3', accent: '#E3F2FD', icon: '🔬' },
    { bg: '#4CAF50', accent: '#E8F5E8', icon: '🌱' },
    { bg: '#FF9800', accent: '#FFF3E0', icon: '💡' }
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  
  return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${theme.accent};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${theme.bg};stop-opacity:0.1" />
      </linearGradient>
      <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:white;stop-opacity:0.9" />
        <stop offset="100%" style="stop-color:${theme.bg};stop-opacity:0.1" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="400" height="300" fill="url(#bgGradient)"/>
    
    <!-- Main content card -->
    <rect x="40" y="40" width="320" height="220" fill="url(#cardGradient)" rx="15" stroke="${theme.bg}" stroke-width="2"/>
    
    <!-- Icon circle -->
    <circle cx="200" cy="110" r="25" fill="${theme.bg}" opacity="0.8"/>
    <text x="200" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="24">
      ${theme.icon}
    </text>
    
    <!-- Title -->
    <text x="200" y="160" text-anchor="middle" fill="${theme.bg}" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
      Course Illustration
    </text>
    
    <!-- Description -->
    <text x="200" y="185" text-anchor="middle" fill="${theme.bg}" font-family="Arial, sans-serif" font-size="12" opacity="0.7">
      ${prompt.substring(0, 45)}${prompt.length > 45 ? '...' : ''}
    </text>
    
    <!-- Decorative elements -->
    <circle cx="80" cy="80" r="3" fill="${theme.bg}" opacity="0.3"/>
    <circle cx="320" cy="80" r="3" fill="${theme.bg}" opacity="0.3"/>
    <circle cx="80" cy="220" r="3" fill="${theme.bg}" opacity="0.3"/>
    <circle cx="320" cy="220" r="3" fill="${theme.bg}" opacity="0.3"/>
  </svg>`;
}