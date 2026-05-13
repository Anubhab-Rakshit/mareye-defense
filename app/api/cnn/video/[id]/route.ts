import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { decodeBase64PathSegment, resolveInsideBase, sanitizeFileSegment } from "@/lib/path-security"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Decode the video ID (it's base64 encoded filename)
    const decoded = decodeBase64PathSegment(id)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid video id" }, { status: 400 })
    }
    const filename = sanitizeFileSegment(decoded)
    
    // Construct the path to the video file
    const baseDir = join(process.cwd(), "temp", "output")
    const videoPath = resolveInsideBase(baseDir, filename)
    if (!videoPath) {
      return NextResponse.json({ error: "Invalid video path" }, { status: 403 })
    }
    
    if (!existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }
    
    // Read the video file
    const videoBuffer = await readFile(videoPath)
    
    // Determine content type - force video/mp4 for better browser compatibility
    let contentType = "video/mp4"
    if (filename.endsWith('.webm')) {
      contentType = "video/webm"
    }
    
    // Return the video with appropriate headers for streaming
    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": videoBuffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Content-Disposition": "inline",
      },
    })
  } catch (error) {
    console.error("Video serving error:", error)
    return NextResponse.json({ 
      error: "Failed to serve video",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
