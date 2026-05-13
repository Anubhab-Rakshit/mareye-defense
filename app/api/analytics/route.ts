import { NextRequest, NextResponse } from "next/server"
import { readFile, readdir, rm } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { resolveInsideBase, sanitizeFileSegment } from "@/lib/path-security"

export async function GET(request: NextRequest) {
  try {
    const projectRoot = process.cwd()
    const analyticsDir = join(projectRoot, "Deep_Sea-NN-main", "analytics_output")
    
    if (!existsSync(analyticsDir)) {
      return NextResponse.json({ 
        error: "Analytics directory not found" 
      }, { status: 404 })
    }

    // Get all analysis directories
    const analysisDirs = await readdir(analyticsDir, { withFileTypes: true })
    const analysisResults = []

    for (const dir of analysisDirs) {
      if (dir.isDirectory()) {
        const analysisPath = join(analyticsDir, dir.name)
        
        // Look for JSON report (try different naming patterns)
        let jsonReportPath = join(analysisPath, `${dir.name}_detailed_report.json`)
        if (!existsSync(jsonReportPath)) {
          // Try alternative naming pattern
          const files = await readdir(analysisPath)
          const jsonFile = files.find(file => file.endsWith('_detailed_report.json'))
          if (jsonFile) {
            jsonReportPath = join(analysisPath, jsonFile)
          }
        }
        
        if (existsSync(jsonReportPath)) {
          try {
            const jsonContent = await readFile(jsonReportPath, "utf-8")
            const reportData = JSON.parse(jsonContent)
            
            // Get all PNG files (graphs)
            const files = await readdir(analysisPath)
            const graphFiles = files.filter(file => file.endsWith('.png'))
            
            // Convert graph files to base64
            const graphs: Record<string, string> = {}
            for (const graphFile of graphFiles) {
              const graphPath = join(analysisPath, graphFile)
              const graphBuffer = await readFile(graphPath)
              const graphBase64 = graphBuffer.toString("base64")
              const graphName = graphFile.replace('.png', '')
              graphs[graphName] = `data:image/png;base64,${graphBase64}`
            }
            
            // Try to load original and enhanced images if file paths exist
            const enhancedReportData = { ...reportData }
            if (reportData.file_paths) {
              // Try to load original image
              const originalPath =
                typeof reportData.file_paths.original === "string"
                  ? resolveInsideBase(projectRoot, reportData.file_paths.original)
                  : null

              if (originalPath && existsSync(originalPath)) {
                try {
                  const originalBuffer = await readFile(originalPath)
                  const originalBase64 = originalBuffer.toString("base64")
                  const ext = originalPath.split('.').pop()?.toLowerCase() || 'jpg'
                  enhancedReportData.original_image = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${originalBase64}`
                } catch (error) {
                  console.warn(`Failed to load original image for ${dir.name}:`, error)
                }
              }
              
              // Try to load enhanced image
              const enhancedPath =
                typeof reportData.file_paths.enhanced === "string"
                  ? resolveInsideBase(projectRoot, reportData.file_paths.enhanced)
                  : null

              if (enhancedPath && existsSync(enhancedPath)) {
                try {
                  const enhancedBuffer = await readFile(enhancedPath)
                  const enhancedBase64 = enhancedBuffer.toString("base64")
                  const ext = enhancedPath.split('.').pop()?.toLowerCase() || 'jpg'
                  enhancedReportData.enhanced_image = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${enhancedBase64}`
                } catch (error) {
                  console.warn(`Failed to load enhanced image for ${dir.name}:`, error)
                }
              }
            }
            
            analysisResults.push({
              analysisName: dir.name,
              reportData: enhancedReportData,
              graphs: graphs,
              timestamp: reportData.timestamp || new Date().toISOString()
            })
          } catch (error) {
            console.warn(`Failed to process analysis ${dir.name}:`, error)
          }
        }
      }
    }

    // Sort by timestamp (newest first)
    analysisResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      success: true,
      analyses: analysisResults,
      totalAnalyses: analysisResults.length
    })

  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch analytics data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const rawAnalysisName = typeof body?.analysisName === "string" ? body.analysisName : ""
    const analysisName = sanitizeFileSegment(rawAnalysisName)

    if (!analysisName) {
      return NextResponse.json({ 
        error: "Analysis name is required" 
      }, { status: 400 })
    }

    if (analysisName !== rawAnalysisName) {
      return NextResponse.json({
        error: "Invalid analysis name"
      }, { status: 400 })
    }

    const analyticsDir = join(process.cwd(), "Deep_Sea-NN-main", "analytics_output")
    const analysisPath = resolveInsideBase(analyticsDir, analysisName)

    if (!analysisPath) {
      return NextResponse.json({
        error: "Invalid analysis path"
      }, { status: 403 })
    }

    if (!existsSync(analysisPath)) {
      return NextResponse.json({ 
        error: "Analysis not found" 
      }, { status: 404 })
    }

    // Delete the entire analysis directory
    await rm(analysisPath, { recursive: true, force: true })

    return NextResponse.json({
      success: true,
      message: `Analysis "${analysisName}" deleted successfully`
    })

  } catch (error) {
    console.error("Analytics DELETE error:", error)
    return NextResponse.json({ 
      error: "Failed to delete analysis",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
