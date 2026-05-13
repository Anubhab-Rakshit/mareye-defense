import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { decodeBase64PathSegment, resolveInsideBase, sanitizeFileSegment } from "@/lib/path-security"

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId
    const decoded = decodeBase64PathSegment(videoId)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid video id" }, { status: 400 })
    }
    const fileName = sanitizeFileSegment(decoded)
    
    console.log(`Serving CNN video: ${fileName}`)
    
    // Path to the CNN directory
    const baseDir = join(process.cwd(), "CNN")
    const videoPath = resolveInsideBase(baseDir, fileName)

    if (!videoPath) {
      return NextResponse.json({ error: "Invalid video path" }, { status: 403 })
    }
    
    if (!existsSync(videoPath)) {
      console.log(`CNN video not found: ${videoPath}`)
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }
    
    // Read the video file
    const videoBuffer = await readFile(videoPath)
    
    // Set appropriate headers for video streaming
    const headers = new Headers()
    headers.set('Content-Type', 'video/mp4')
    headers.set('Content-Length', videoBuffer.length.toString())
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'public, max-age=3600')
    
    return new NextResponse(new Uint8Array(videoBuffer), {
      status: 200,
      headers
    })
    
  } catch (error) {
    console.error("Error serving CNN video:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
