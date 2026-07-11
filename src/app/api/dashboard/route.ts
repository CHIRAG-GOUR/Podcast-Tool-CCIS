import { NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reportsRef = adminDb.collection("research_reports");
    const snapshot = await reportsRef.orderBy("createdAt", "desc").get();
    
    const count = snapshot.size;
    
    // Get last 3 recent
    const recent = snapshot.docs.slice(0, 3).map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        topic: data.topic,
        style: data.style,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
      };
    });

    return NextResponse.json({ 
      stats: {
        totalScripts: count,
        avgGenerationTime: "1.2m", // simulated metric
        engagement: `+${Math.floor(Math.random() * 20) + 5}%` // simulated metric
      },
      recent 
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
