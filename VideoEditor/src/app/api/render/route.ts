import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

interface RenderJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  outputUrl?: string;
  error?: string;
}

declare global {
  var renderJobs: Record<string, RenderJob> | undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const renderId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!globalThis.renderJobs) {
      globalThis.renderJobs = {};
    }
    
    globalThis.renderJobs[renderId] = {
      id: renderId,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString()
    };

    const exportsDir = path.resolve("public/exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    startActualRender(renderId, body).catch(error => {
      console.error('FFmpeg processing failed:', error);
      if (globalThis.renderJobs) {
        globalThis.renderJobs[renderId] = {
          ...globalThis.renderJobs[renderId],
          status: 'failed',
          error: error.message
        };
      }
    });

    return NextResponse.json({
      render: {
        id: renderId,
        status: 'pending'
      }
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function startActualRender(renderId: string, composition: any) {
  try {
    if (!globalThis.renderJobs) return;
    
    globalThis.renderJobs[renderId] = {
      ...globalThis.renderJobs[renderId],
      status: 'processing',
      progress: 10
    };

    console.log('PERFECT RENDER - Outlines + Backgrounds + Multiple Videos...');
    
    const outputPath = path.resolve(`public/exports/${renderId}.mp4`);
    const { exec } = require('child_process');
    
    const design = composition.design;
    const trackItemIds = design.trackItemIds;
    const trackItemsMap = design.trackItemsMap;
    
    const videoItems: any[] = [];
    const captionItems: any[] = [];
    
    if (trackItemIds && trackItemsMap) {
      for (const itemId of trackItemIds) {
        const item = trackItemsMap[itemId];
        
        if (item && item.type === 'video' && item.details && item.details.src) {
          videoItems.push(item);
        } else if (item && item.type === 'caption') {
          captionItems.push(item);
        }
      }
    }
    
    if (videoItems.length > 0) {
      const width = design.size.width || 1080;
      const height = design.size.height || 1920;
      const fps = design.fps || 30;
      
      // HANDLE MULTIPLE VIDEOS - WITH PROPER TYPES
      let totalDuration = 0;
      const videoInputs: string[] = [];
      const videoFilters: string[] = [];
      
      // Process all video items
      videoItems.forEach((video: any, index: number) => {
        const videoDuration = Math.ceil((video.duration || video.display?.to || 0) / 1000);
        const videoStart = Math.ceil((video.display?.from || 0) / 1000);
        
        videoInputs.push(`-i "${video.details.src}"`);
        videoFilters.push(`[${index}:v]scale=${width}:${height}[v${index}]`);
        
        totalDuration = Math.max(totalDuration, videoStart + videoDuration);
      });
      
      console.log(`Processing ${videoItems.length} videos with total duration: ${totalDuration}s and ${captionItems.length} captions`);
      
      await downloadCustomFonts(captionItems);
      
      const textFilters: string[] = [];
      
      // PERFECT TEXT RENDERING - WITH OUTLINES AND BACKGROUNDS
      captionItems.forEach((caption: any, index: number) => {
        const fontSize = Math.round((caption.details.fontSize || 64) * 0.9);
        const fontColor = caption.details.color || '#DADADA';
        const activeColor = caption.details.activeColor || '#50FF12';
        const fontFamily = caption.details.fontFamily || 'theboldfont';
        const backgroundColor = caption.details.backgroundColor;
        
        const x = caption.details.left ? parseInt(caption.details.left.replace('px', '')) : 140;
        const y = caption.details.top ? parseInt(caption.details.top.replace('px', '')) : 920;
        const textWidth = caption.details.width || 800;
        const textHeight = caption.details.height || 80;
        
        const fontPath = `public/fonts/${fontFamily}.ttf`;
        const fontFile = fs.existsSync(fontPath) ? fontPath.replace(/\\/g, '/').replace(':', '\\:') : '';
        
        const words: any[] = caption.details.words || [];
        
        // ADD BACKGROUND BOX FIRST
        if (backgroundColor && backgroundColor !== 'transparent') {
          const startTime = caption.display.from / 1000;
          const endTime = caption.display.to / 1000;
          const bgColor = backgroundColor.replace('#', '').toLowerCase();
          
          textFilters.push(`drawbox=x=${x-10}:y=${y-15}:w=${textWidth+20}:h=${textHeight+30}:color=0x${bgColor}@0.8:t=fill:enable='between(t,${startTime},${endTime})'`);
        }
        
        if (words.length > 0) {
          // WORD-BY-WORD WITH THICK OUTLINE
          words.forEach((word: any, wordIndex: number) => {
            const wordStartTime = word.start / 1000;
            const wordEndTime = word.end / 1000;
            const escapedWord = word.word.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/,/g, "\\,");
            const wordX = x + (wordIndex * fontSize * 0.6);
            
            const isKeyword = word.is_keyword;
            const wordColor = isKeyword ? activeColor : fontColor;
            
            if (fontFile) {
              // THICK BLACK OUTLINE (multiple layers) - WITH PROPER TYPES
              const outlineOffsets: number[] = [-2, -1, 0, 1, 2];
              for (const offsetX of outlineOffsets) {
                for (const offsetY of outlineOffsets) {
                  if (offsetX !== 0 || offsetY !== 0) {
                    textFilters.push(`drawtext=text='${escapedWord}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=black:x=${wordX+offsetX}:y=${y+offsetY}:enable='between(t,${wordStartTime},${wordEndTime})'`);
                  }
                }
              }
              
              // MAIN TEXT
              textFilters.push(`drawtext=text='${escapedWord}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=${wordColor}:x=${wordX}:y=${y}:enable='between(t,${wordStartTime},${wordEndTime})'`);
              
              // GLOW for keywords
              if (isKeyword) {
                textFilters.push(`drawtext=text='${escapedWord}':fontfile='${fontFile}':fontsize=${fontSize+4}:fontcolor=${activeColor}@0.3:x=${wordX-2}:y=${y-2}:enable='between(t,${wordStartTime},${wordEndTime})'`);
              }
            } else {
              textFilters.push(`drawtext=text='${escapedWord}':fontsize=${fontSize}:fontcolor=${wordColor}:x=${wordX}:y=${y}:box=1:boxcolor=black@0.8:boxborderw=3:enable='between(t,${wordStartTime},${wordEndTime})'`);
            }
          });
        } else {
          // FALLBACK: Full text with thick outline
          const startTime = caption.display.from / 1000;
          const endTime = caption.display.to / 1000;
          const text = caption.details.text.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/,/g, "\\,");
          const hasKeywords = caption.details.words?.some((word: any) => word.is_keyword);
          const textColor = hasKeywords ? activeColor : fontColor;
          
          if (fontFile) {
            // THICK BLACK OUTLINE - WITH PROPER TYPES
            const outlineOffsets: number[] = [-2, -1, 0, 1, 2];
            for (const offsetX of outlineOffsets) {
              for (const offsetY of outlineOffsets) {
                if (offsetX !== 0 || offsetY !== 0) {
                  textFilters.push(`drawtext=text='${text}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=black:x=${x+offsetX}:y=${y+offsetY}:enable='between(t,${startTime},${endTime})'`);
                }
              }
            }
            
            textFilters.push(`drawtext=text='${text}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=${textColor}:x=${x}:y=${y}:enable='between(t,${startTime},${endTime})'`);
          } else {
            textFilters.push(`drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${textColor}:x=${x}:y=${y}:box=1:boxcolor=black@0.8:boxborderw=3:enable='between(t,${startTime},${endTime})'`);
          }
        }
      });
      
      // COMBINE VIDEO AND TEXT FILTERS - WITH PROPER TYPES
      let allFilters = '';
      
      if (videoItems.length === 1) {
        // Single video
        const baseFilters = [`[0:v]scale=${width}:${height}[v]`];
        allFilters = [...baseFilters, ...textFilters].join(',');
        if (textFilters.length > 0) {
          allFilters = allFilters.replace('[v]', '[v];[v]');
        }
      } else {
        // Multiple videos
        const videoLabels = videoItems.map((_: any, i: number) => `[v${i}]`).join('');
        const concatFilter = `${videoLabels}concat=n=${videoItems.length}:v=1:a=0[v]`;
        
        const allFiltersList = [...videoFilters, concatFilter, ...textFilters];
        allFilters = allFiltersList.join(',');
        if (textFilters.length > 0) {
          allFilters = allFilters.replace('[v]', '[v];[v]');
        }
      }
      
      // BUILD FFMPEG COMMAND - WITH PROPER TYPES
      const videoInputsStr: string = videoInputs.join(' ');
      const audioInput: string = videoItems[0].details.src; // Use first video's audio
      
      const ffmpegCommand: string = `ffmpeg ${videoInputsStr} -i "${audioInput}" -t ${totalDuration} -filter_complex "${allFilters}" -map "[v]" -map ${videoItems.length}:a -c:v libx264 -c:a aac -b:a 128k -ar 48000 -pix_fmt yuv420p -r ${fps} -shortest -y "${outputPath}"`;
      
      console.log(`Generated perfect command with ${textFilters.length} text effects and ${videoItems.length} videos`);
      
      if (globalThis.renderJobs) {
        globalThis.renderJobs[renderId].progress = 70;
      }
      
      // Handle long commands
      if (ffmpegCommand.length > 8000) {
        const scriptPath = await createPowerShellScript(renderId, ffmpegCommand);
        const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
        
        exec(command, { timeout: 120000 }, (error: any, stdout: any, stderr: any) => {
          if (fs.existsSync(scriptPath)) {
            fs.unlinkSync(scriptPath);
          }
          handleExecResult(error, stdout, stderr, renderId, outputPath);
        });
      } else {
        exec(ffmpegCommand, { timeout: 120000 }, (error: any, stdout: any, stderr: any) => {
          handleExecResult(error, stdout, stderr, renderId, outputPath);
        });
      }
    }

  } catch (error) {
    console.error('Export error:', error);
    if (globalThis.renderJobs) {
      globalThis.renderJobs[renderId] = {
        ...globalThis.renderJobs[renderId],
        status: 'failed',
        error: String(error)
      };
    }
  }
}

function handleExecResult(error: any, stdout: any, stderr: any, renderId: string, outputPath: string) {
  if (error) {
    console.error('FFmpeg error:', error);
    if (globalThis.renderJobs) {
      globalThis.renderJobs[renderId] = {
        ...globalThis.renderJobs[renderId],
        status: 'failed',
        error: error.message
      };
    }
    return;
  }
  
  console.log('PERFECT RENDER COMPLETE WITH ALL EFFECTS!');
  
  if (fs.existsSync(outputPath)) {
    if (globalThis.renderJobs) {
      globalThis.renderJobs[renderId] = {
        ...globalThis.renderJobs[renderId],
        status: 'completed',
        progress: 100,
        outputUrl: `/api/download/${renderId}.mp4`
      };
    }
    console.log('SUCCESS: Perfect video with outlines and backgrounds ready!');
  }
}

async function createPowerShellScript(renderId: string, ffmpegCommand: string): Promise<string> {
  const scriptPath = path.resolve(`public/exports/render_${renderId}.ps1`);
  const scriptContent = `
$ErrorActionPreference = "Stop"
Write-Host "Starting perfect FFmpeg render..."

& ${ffmpegCommand}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Perfect FFmpeg render completed successfully!"
} else {
    Write-Host "FFmpeg failed with exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}
`.trim();

  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  return scriptPath;
}

async function downloadCustomFonts(captionItems: any[]) {
  const https = require('https');
  const fontDir = path.resolve('public/fonts');
  
  if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
  }
  
  for (const caption of captionItems) {
    const fontFamily = caption.details.fontFamily;
    const fontUrl = caption.details.fontUrl;
    
    if (fontFamily && fontUrl) {
      const fontPath = path.join(fontDir, `${fontFamily}.ttf`);
      
      if (!fs.existsSync(fontPath)) {
        try {
          console.log(`Downloading font: ${fontFamily}`);
          
          await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(fontPath);
            https.get(fontUrl, (response: any) => {
              response.pipe(file);
              file.on('finish', () => {
                file.close();
                console.log(`Font downloaded: ${fontPath}`);
                resolve(true);
              });
            }).on('error', (err: any) => {
              console.error(`Font download failed: ${err}`);
              reject(err);
            });
          });
        } catch (error) {
          console.error(`Failed to download font ${fontFamily}:`, error);
        }
      }
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "id parameter is required" },
        { status: 400 }
      );
    }

    const job = globalThis.renderJobs?.[id];
    
    if (!job) {
      return NextResponse.json(
        { message: "Render job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(job, { status: 200 });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
