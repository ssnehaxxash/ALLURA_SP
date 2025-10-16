import { NextResponse } from "next/server";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // CONVERT TO FORMAT EXPECTED BY DOWNLOAD STATE
    const response = {
      render: {
        status: job.status.toUpperCase(), // completed → COMPLETED
        progress: job.progress,
        presigned_url: job.outputUrl
      }
    };

    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
