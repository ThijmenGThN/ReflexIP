import axios from "axios"
import { NextRequest, NextResponse } from "next/server"
import { WebServiceClient } from "@maxmind/geoip2-node"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ site: string; ip: string }> }
) {
    const { site, ip } = await params
    const maxmindaccount = process.env.MAXMIND_ACCOUNT || ""
    const geoipKey = process.env.MAXMIND_KEY || ""
    const geoipClient = new WebServiceClient(maxmindaccount, geoipKey)
    const geoliteClient = new WebServiceClient(maxmindaccount, geoipKey, {
        host: "geolite.info",
    })
    if (site === "geoip2") {
        try {
            const r = await geoipClient.city(ip)
            return NextResponse.json(r)
        } catch {
            return NextResponse.json({ error: "Error with geoip2" })
        }
    }
    if (site === "geolite2") {
        try {
            const r = await geoliteClient.city(ip)
            return NextResponse.json(r)
        } catch {
            return NextResponse.json({ error: "Error with geolite2" })
        }
    }
    const sites = await import("../../../../../../public/sites.json")
    if (!(site in sites.default)) {
        return NextResponse.json({ error: "Site not found" })
    }
    const typedSites = sites.default as unknown as Record<string, { homepage: string; client: string; server: string; formats: string[]; https: boolean; limit: string }>;
    let url = typedSites[site].server.replace("8.8.8.8", ip)
    try {
        const r = await axios.get(url)
        return NextResponse.json(r.data)
    } catch {
        return NextResponse.json({ error: `Error with ${site}` })
    }
}
