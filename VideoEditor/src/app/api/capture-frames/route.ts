import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const { frames, renderId, audioSrc, duration } = await request.json();
    
    console.log(`Received ${frames.length} frames for render ${renderId}`);
    
    // Save frames to disk
    const framesDir = path.resolve(`public/exports/frames_${renderId}`);
    if (fs.existsSync(framesDir)) {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }
    fs.mkdirSync(framesDir, { recursive: true });
    
    // Save each frame as PNG
    for (let i = 0; i < frames.length; i++) {
      const frameData = frames[i].replace(/^data:image\/png;base64,/, '');
      const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
      fs.writeFileSync(framePath, frameData, 'base64');
    }
    
    console.log(`Saved ${frames.length} frames`);
    
    // Immediately start video creation
    const outputPath = path.resolve(`public/exports/${renderId}.mp4`);
    const { exec } = require('child_process');
    
    const fps = 30;
    
    let ffmpegCommand = '';
    
    if (audioSrc) {
      // WITH AUDIO
      ffmpegCommand = `ffmpeg -framerate ${fps} -i "${framesDir}/frame_%04d.png" -i "${audioSrc}" -t ${duration} -c:v libx264 -c:a aac -b:a 128k -pix_fmt yuv420p -r ${fps} -shortest -y "${outputPath}"`;
    } else {
      // NO AUDIO
      ffmpegCommand = `ffmpeg -framerate ${fps} -i "${framesDir}/frame_%04d.png" -t ${duration} -c:v libx264 -pix_fmt yuv420p -r ${fps} -y "${outputPath}"`;
    }
    
    console.log('Creating video from frames...');
    
    exec(ffmpegCommand, { timeout: 120000 }, (error: any) => {
      // Clean up frames
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
      
      if (error) {
        console.error('Frame-to-video error:', error);
        return;
      }
      
      console.log('CANVAS VIDEO CREATED SUCCESSFULLY!');
      
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`Perfect canvas video: ${outputPath} (${stats.size} bytes)`);
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      frameCount: frames.length,
      message: 'Frames received, video being created...'
    });
    
  } catch (error) {
    console.error('Frame capture error:', error);
    return NextResponse.json({ error: 'Failed to capture frames' }, { status: 500 });
  }
}
