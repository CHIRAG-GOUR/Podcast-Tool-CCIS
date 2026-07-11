import { NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reportsRef = adminDb.collection("research_reports");
    const snapshot = await reportsRef.orderBy("createdAt", "desc").get();
    
    const reports = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        topic: data.topic,
        report: data.report,
        style: data.style,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
      };
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching library reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
