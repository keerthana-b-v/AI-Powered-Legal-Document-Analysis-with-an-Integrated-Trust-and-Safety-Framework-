const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Compression threshold (10MB)
const COMPRESSION_THRESHOLD = 10 * 1024 * 1024

/**
 * Check if batch needs compression based on total size
 */
function needsCompression(files) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  return totalSize > COMPRESSION_THRESHOLD
}

/**
 * Compress a single file based on its type
 */
async function compressFile(filePath, outputPath) {
  const ext = path.extname(filePath).toLowerCase()

  try {
    switch (ext) {
      case ".pdf":
        return await compressPDF(filePath, outputPath)
      case ".png":
        return await compressPNG(filePath, outputPath)
      case ".jpg":
      case ".jpeg":
        return await compressJPEG(filePath, outputPath)
      default:
        // For unsupported formats, just copy the file
        fs.copyFileSync(filePath, outputPath)
        return {
          originalSize: fs.statSync(filePath).size,
          compressedSize: fs.statSync(outputPath).size,
          compressionRatio: 1.0,
        }
    }
  } catch (error) {
    console.error(`Compression failed for ${filePath}:`, error)
    // Fallback: copy original file
    fs.copyFileSync(filePath, outputPath)
    const size = fs.statSync(outputPath).size
    return {
      originalSize: size,
      compressedSize: size,
      compressionRatio: 1.0,
      error: error.message,
    }
  }
}

/**
 * Compress PDF using Ghostscript (lossless)
 */
async function compressPDF(inputPath, outputPath) {
  const originalSize = fs.statSync(inputPath).size

  try {
    // Use Ghostscript for PDF compression
    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`

    execSync(command, { timeout: 30000 }) // 30 second timeout

    const compressedSize = fs.statSync(outputPath).size

    return {
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
    }
  } catch (error) {
    // If Ghostscript fails, fall back to copying
    console.warn(`Ghostscript compression failed, using original file: ${error.message}`)
    fs.copyFileSync(inputPath, outputPath)

    return {
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
      fallback: true,
    }
  }
}

/**
 * Compress PNG using optipng (lossless)
 */
async function compressPNG(inputPath, outputPath) {
  const originalSize = fs.statSync(inputPath).size

  try {
    // Copy file first, then optimize in place
    fs.copyFileSync(inputPath, outputPath)

    // Use optipng for lossless PNG compression
    const command = `optipng -o2 "${outputPath}"`

    execSync(command, { timeout: 30000 })

    const compressedSize = fs.statSync(outputPath).size

    return {
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
    }
  } catch (error) {
    // If optipng fails, ensure we have the original file
    if (!fs.existsSync(outputPath)) {
      fs.copyFileSync(inputPath, outputPath)
    }

    return {
      originalSize,
      compressedSize: fs.statSync(outputPath).size,
      compressionRatio: 1.0,
      fallback: true,
    }
  }
}

/**
 * Compress JPEG using jpegtran (lossless)
 */
async function compressJPEG(inputPath, outputPath) {
  const originalSize = fs.statSync(inputPath).size

  try {
    // Use jpegtran for lossless JPEG optimization
    const command = `jpegtran -optimize -progressive -outfile "${outputPath}" "${inputPath}"`

    execSync(command, { timeout: 30000 })

    const compressedSize = fs.statSync(outputPath).size

    return {
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
    }
  } catch (error) {
    // If jpegtran fails, fall back to copying
    console.warn(`jpegtran compression failed, using original file: ${error.message}`)
    fs.copyFileSync(inputPath, outputPath)

    return {
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
      fallback: true,
    }
  }
}

/**
 * Compress multiple files in a batch
 */
async function compressBatch(files, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const results = []
  let totalOriginalSize = 0
  let totalCompressedSize = 0

  for (const file of files) {
    const outputPath = path.join(outputDir, `compressed_${file.filename}`)

    try {
      const result = await compressFile(file.path, outputPath)

      results.push({
        filename: file.filename,
        originalPath: file.path,
        compressedPath: outputPath,
        ...result,
      })

      totalOriginalSize += result.originalSize
      totalCompressedSize += result.compressedSize

      console.log(
        `✅ Compressed ${file.filename}: ${result.originalSize} → ${result.compressedSize} bytes (${(result.compressionRatio).toFixed(2)}x)`,
      )
    } catch (error) {
      console.error(`❌ Failed to compress ${file.filename}:`, error)

      // Add error result
      results.push({
        filename: file.filename,
        originalPath: file.path,
        compressedPath: null,
        error: error.message,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1.0,
      })

      totalOriginalSize += file.size
      totalCompressedSize += file.size
    }
  }

  const overallCompressionRatio = totalOriginalSize / totalCompressedSize

  console.log(
    `📦 Batch compression completed: ${totalOriginalSize} → ${totalCompressedSize} bytes (${overallCompressionRatio.toFixed(2)}x compression)`,
  )

  return {
    results,
    totalOriginalSize,
    totalCompressedSize,
    overallCompressionRatio,
    compressionEnabled: true,
  }
}

/**
 * Check if compression tools are available
 */
function checkCompressionTools() {
  const tools = {
    ghostscript: false,
    optipng: false,
    jpegtran: false,
  }

  try {
    execSync("gs --version", { stdio: "ignore" })
    tools.ghostscript = true
  } catch (e) {
    console.warn("⚠️  Ghostscript not found - PDF compression will be disabled")
  }

  try {
    execSync("optipng --version", { stdio: "ignore" })
    tools.optipng = true
  } catch (e) {
    console.warn("⚠️  optipng not found - PNG compression will be disabled")
  }

  try {
    execSync("jpegtran -version", { stdio: "ignore" })
    tools.jpegtran = true
  } catch (e) {
    console.warn("⚠️  jpegtran not found - JPEG compression will be disabled")
  }

  return tools
}

module.exports = {
  needsCompression,
  compressFile,
  compressBatch,
  checkCompressionTools,
  COMPRESSION_THRESHOLD,
}
