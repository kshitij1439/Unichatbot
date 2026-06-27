import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { userId: null },
          { userId: user.userId },
        ],
      },
      select: {
        id: true,
        name: true,
        path: true,
        createdAt: true,
        analysis: true, // check if already analyzed
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    console.error("Fetch completed documents error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, documentIds } = await req.json();
    const targetIds: string[] = documentIds || (documentId ? [documentId] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "documentIds or documentId is required" }, { status: 400 });
    }

    // 1. Fetch documents and related chunks
    const documents = await prisma.document.findMany({
      where: { id: { in: targetIds } },
      include: {
        chunks: {
          orderBy: { pageIndex: "asc" },
          select: { content: true },
        },
      },
    });

    if (documents.length === 0) {
      return NextResponse.json({ error: "No documents found" }, { status: 404 });
    }

    // 2. Check cached analysis matching the exact set of selected documents
    const sortedTargetIds = [...targetIds].sort();
    for (const doc of documents) {
      if (doc.analysis) {
        try {
          const parsed = JSON.parse(doc.analysis);
          const parsedIds = parsed.documentIds || [doc.id];
          const sortedParsedIds = [...parsedIds].sort();

          if (JSON.stringify(sortedTargetIds) === JSON.stringify(sortedParsedIds)) {
            return NextResponse.json({ success: true, analysis: parsed, cached: true });
          }
        } catch (e) {
          console.warn("Cached analysis JSON parsing failed, regenerating...", e);
        }
      }
    }

    // 3. Check for any missing chunks
    const hasNoChunks = documents.every(d => !d.chunks || d.chunks.length === 0);
    if (hasNoChunks) {
      return NextResponse.json(
        { error: "None of the selected documents contain text chunks. Make sure they are fully ingested." },
        { status: 400 }
      );
    }

    // 4. Combine document text contents with clear source annotations
    const combinedText = documents
      .flatMap((doc) =>
        (doc.chunks || []).map((c) => `[Source Document: ${doc.name}]\n${c.content}`)
      )
      .join("\n\n")
      .slice(0, 100000); // Safely allow up to ~100k chars for multiple files

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    // 5. Generate structured report via Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
      You are an expert Savitribai Phule Pune University (SPPU) Exam Paper Pattern Analyzer.
      Your task is to analyze the provided set of past exam question papers, syllabi, or study notes, and produce a unified analysis report of topic frequencies, exam predictions, and unit weightages in JSON format.

      Here is the aggregated content from the selected documents:
      """
      ${combinedText}
      """

      You MUST respond with a valid JSON object matching the following structure:
      {
        "subject": "Name of the subject/course (or combination description)",
        "topics": [
          {
            "topicName": "Name of the topic/concept",
            "unitName": "Unit X: Title",
            "frequency": 5, // Estimated total occurrences/references across the papers
            "importance": "High" | "Medium" | "Low",
            "averageMarks": 8, // Typical marks allotted to this topic (e.g. 4, 6, 8, 12)
            "lastAsked": "Semester/Month Year (e.g. May 2024 or N/A)"
          }
        ],
        "heatmapUnits": [
          {
            "unitName": "Unit X: Title",
            "weight": 24, // Expected percentage or typical total marks from this unit
            "description": "Brief summary of what this unit covers"
          }
        ],
        "predictions": [
          {
            "questionText": "A concrete question likely to appear in the exam",
            "expectedMarks": 8,
            "probability": 0.85, // Probability score between 0.0 and 1.0
            "rationale": "Why is this question predicted? (e.g., highly recurring across past papers, fits core unit objectives)",
            "unit": "Unit X: Title"
          }
        ],
        "studyPlanner": [
          {
            "priority": 1, // Number representing importance order (1 is highest)
            "task": "A specific revision goal",
            "actionItem": "Actionable step"
          }
        ]
      }

      Do not include any markdown backticks or explanations outside the JSON response. Simply return a raw JSON string.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    let analysisJson;
    try {
      analysisJson = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON. Response text was:", responseText);
      return NextResponse.json({ error: "AI response format was invalid. Please try again." }, { status: 500 });
    }

    // Include the source document IDs in the cached report payload
    const cachePayload = {
      ...analysisJson,
      documentIds: targetIds,
    };

    // Cache the result in the primary document of the set
    await prisma.document.update({
      where: { id: documents[0].id },
      data: {
        analysis: JSON.stringify(cachePayload),
      },
    });

    return NextResponse.json({ success: true, analysis: cachePayload, cached: false });
  } catch (error: any) {
    console.error("Paper Pattern Analyzer API error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze paper pattern" }, { status: 500 });
  }
}
