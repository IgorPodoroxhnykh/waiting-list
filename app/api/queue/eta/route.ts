// app/api/queue/eta/route.ts
import { NextResponse } from 'next/server'
import { calculateETA } from '@/lib/scheduler'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const excludeId = searchParams.get('excludeId') ?? undefined

        const result = await calculateETA(excludeId)

        return NextResponse.json({
            success: true,
            data: {
                eta: result.eta.toISOString(),
                position: result.position,
                waitMinutes: result.waitMinutes,
                canStartNow: result.canStartNow,
                exceedsMaxWait: result.exceedsMaxWait
            }
        })
    } catch (error) {
        console.error('Error calculating ETA:', error)
        return NextResponse.json(
            { error: 'Failed to calculate ETA' },
            { status: 500 }
        )
    }
}