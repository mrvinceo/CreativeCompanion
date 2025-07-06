import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  try {
    const result = await model.generateContent([
      {
        text: `Create an educational illustration for a micro-course. The image should be: ${imagePrompt}. Make it visually appealing, professional, and suitable for learning materials.`
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // For now, return a placeholder since image generation with Gemini requires specific setup
    // In a real implementation, this would generate and return actual image data
    return `data:image/svg+xml;base64,${Buffer.from(createPlaceholderSVG(imagePrompt)).toString('base64')}`;
  } catch (error) {
    console.error("Image generation error:", error);
    return `data:image/svg+xml;base64,${Buffer.from(createPlaceholderSVG(imagePrompt)).toString('base64')}`;
  }
}

function createPlaceholderSVG(prompt: string): string {
  const colors = ['#F5A623', '#E91E63', '#2196F3', '#4CAF50', '#FF9800'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="300" fill="${color}" opacity="0.1"/>
    <rect x="50" y="50" width="300" height="200" fill="${color}" opacity="0.3" rx="10"/>
    <text x="200" y="140" text-anchor="middle" fill="${color}" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
      Course Illustration
    </text>
    <text x="200" y="170" text-anchor="middle" fill="${color}" font-family="Arial, sans-serif" font-size="12" opacity="0.8">
      ${prompt.substring(0, 40)}...
    </text>
  </svg>`;
}