import { GoogleGenerativeAI, Modality } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface CoursePart {
  title: string;
  content: string;
  imagePrompt: string;
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
  console.log(`[IMAGE GENERATION] Starting generation for prompt: ${imagePrompt}`);
  
  try {
    // Use Google's Imagen 3 API through the Gemini API
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-preview-image-generation"
    });

    const prompt = `Create an educational illustration for a micro-course. The image should be: ${imagePrompt}. Make it visually appealing, professional, and suitable for learning materials. Style: Clean, modern, educational, with good contrast and clear visual elements.`;

    console.log(`[IMAGE GENERATION] Sending request to Gemini API with model: gemini-2.0-flash-preview-image-generation`);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      }
    });

    const response = await result.response;
    const candidates = response.candidates;
    
    console.log(`[IMAGE GENERATION] Response received. Candidates count: ${candidates?.length || 0}`);
    
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      if (content && content.parts) {
        console.log(`[IMAGE GENERATION] Content parts count: ${content.parts.length}`);
        
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            // Return the generated image as base64 data URL
            const mimeType = part.inlineData.mimeType || "image/png";
            console.log(`[IMAGE GENERATION] SUCCESS: Generated image with mimeType: ${mimeType}`);
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    
    // If no image was generated, fall back to SVG placeholder
    console.log("[IMAGE GENERATION] No image generated, using SVG placeholder");
    return `data:image/svg+xml;base64,${Buffer.from(createPlaceholderSVG(imagePrompt)).toString('base64')}`;
  } catch (error) {
    console.error("[IMAGE GENERATION] Error:", error);
    // Fall back to SVG placeholder on error
    return `data:image/svg+xml;base64,${Buffer.from(createPlaceholderSVG(imagePrompt)).toString('base64')}`;
  }
}

function createPlaceholderSVG(prompt: string): string {
  const colors = ['#F5A623', '#E91E63', '#2196F3', '#4CAF50', '#FF9800'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:${color};stop-opacity:0.1" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#grad1)"/>
    <rect x="30" y="30" width="340" height="240" fill="white" opacity="0.9" rx="15"/>
    <rect x="40" y="40" width="320" height="160" fill="${color}" opacity="0.1" rx="8"/>
    <circle cx="200" cy="100" r="30" fill="${color}" opacity="0.3"/>
    <rect x="150" y="85" width="100" height="30" fill="${color}" opacity="0.5" rx="15"/>
    <text x="200" y="160" text-anchor="middle" fill="${color}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600">
      AI-Generated Image
    </text>
    <text x="200" y="180" text-anchor="middle" fill="${color}" font-family="system-ui, -apple-system, sans-serif" font-size="11" opacity="0.8">
      ${prompt.substring(0, 45)}${prompt.length > 45 ? '...' : ''}
    </text>
    <text x="200" y="250" text-anchor="middle" fill="${color}" font-family="system-ui, -apple-system, sans-serif" font-size="10" opacity="0.6">
      Educational Content Illustration
    </text>
  </svg>`;
}