import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { basename, join } from "path"
import { isPathInside, resolveInsideBase } from "@/lib/path-security"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawPath = searchParams.get("path")

    if (!rawPath) {
      return NextResponse.json({ 
        error: "File path is required" 
      }, { status: 400 })
    }

    const projectRoot = process.cwd()
    const allowedBase = join(projectRoot, "Deep_Sea-NN-main")
    const resolvedFromRaw = resolveInsideBase(projectRoot, rawPath)

    if (!resolvedFromRaw || !isPathInside(allowedBase, resolvedFromRaw)) {
      return NextResponse.json({
        error: "Invalid file path"
      }, { status: 403 })
    }

    if (!existsSync(resolvedFromRaw)) {
      return NextResponse.json({ 
        error: "File not found" 
      }, { status: 404 })
    }

    const fileBuffer = await readFile(resolvedFromRaw)
    const fileName = basename(resolvedFromRaw) || "model"

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })

  } catch (error) {
    console.error("Model download error:", error)
    return NextResponse.json({ 
      error: "Failed to download model",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}


