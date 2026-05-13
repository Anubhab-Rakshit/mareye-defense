import { NextRequest, NextResponse } from "next/server"
import { existsSync } from "fs"
import { resolveInsideBase } from "@/lib/path-security"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deploymentName, deploymentPath } = body

    if (!deploymentName) {
      return NextResponse.json({ 
        error: "Deployment name is required" 
      }, { status: 400 })
    }

    const resolvedDeploymentPath =
      typeof deploymentPath === "string" && deploymentPath.length > 0
        ? resolveInsideBase(process.cwd(), deploymentPath)
        : null

    if (deploymentPath && !resolvedDeploymentPath) {
      return NextResponse.json({
        error: "Invalid deployment path"
      }, { status: 403 })
    }

    // Check if deployment directory exists
    if (resolvedDeploymentPath && !existsSync(resolvedDeploymentPath)) {
      return NextResponse.json({ 
        error: "Deployment directory not found" 
      }, { status: 404 })
    }

    // Simulate deployment process (in production, this would actually deploy)
    // For now, return success
    return NextResponse.json({
      success: true,
      message: `Deployment ${deploymentName} started successfully`,
      deploymentId: `deploy-${Date.now()}`,
      status: "DEPLOYING",
      estimatedTime: "2-3 minutes"
    })

  } catch (error) {
    console.error("Deployment error:", error)
    return NextResponse.json({ 
      error: "Failed to deploy",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}


