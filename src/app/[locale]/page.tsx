"use client"

import { useState, useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import axios from "axios"
import { motion } from "framer-motion"
import {
    MapPinIcon,
    GlobeAltIcon,
    ArrowTopRightOnSquareIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    ClockIcon,
    LinkIcon,
    ServerIcon
} from "@heroicons/react/24/outline"

interface ResultItem {
    api: string
    data: any
    time: string
    lat: number
    lng: number
}

export default function Home() {
    const mapContainer = useRef<HTMLDivElement>(null)
    const [map, setMap] = useState<maplibregl.Map>()
    const [ip, setIp] = useState("")
    const [results, setResults] = useState<ResultItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [expandedCard, setExpandedCard] = useState<number | null>(null)

    useEffect(() => {
        const m = new maplibregl.Map({
            container: mapContainer.current as HTMLElement,
            style: "https://api.maptiler.com/maps/basic-v2/style.json?key=gB6P57S1Ofik49XFcLSa",
            center: [0, 45],
            zoom: 3
        })
        const navControl = new maplibregl.NavigationControl({
            showCompass: true,
            visualizePitch: true
        })
        m.addControl(navControl, "bottom-right")
        m.on("load", () => {
            const controls = document.querySelector(".maplibregl-control-container")
            if (controls) {
                controls.classList.add(
                    "opacity-70",
                    "hover:opacity-100",
                    "transition-opacity",
                    "duration-300"
                )
            }
        })
        setMap(m)

            ; (async () => {
                try {
                    const res = await fetch("https://api.ipify.org?format=json")
                    const data = await res.json()
                    setIp(data.ip)
                } catch {
                    setError("Could not detect your IP address")
                }
            })()
        return () => m.remove()
    }, [])

    function goToLocation(lat: number, lng: number) {
        if (map) {
            map.flyTo({ center: [lng, lat], zoom: 9, speed: 1.2, curve: 1.4 })
        }
    }

    function toggleCard(index: number) {
        setExpandedCard(expandedCard === index ? null : index)
    }

    function getLocationInfo(data: any) {
        const city = data.city || data.location?.city || data.data?.location?.city || ""
        const country = data.country || data.location?.country || data.data?.location?.country || ""
        const region = data.region || data.location?.region || data.data?.location?.region || ""
        return { city, country, region }
    }

    async function handleFindLocation() {
        if (!map) return
        setResults([])
        setLoading(true)
        setError("")
        try {
            const sjson = await fetch("/sites.json").then((r) => r.json())
            let firstCenter = true
            let foundResults = false
            document.querySelectorAll(".maplibregl-marker").forEach((marker) => {
                marker.remove()
            })
            for (const [api] of Object.entries(sjson)) {
                const url = `/api/proxy/${api}/${ip}`
                try {
                    const tStart = performance.now()
                    const r = await axios.get(url)
                    const tEnd = performance.now()
                    const data = r.data
                    const lat =
                        data.latitude ||
                        data.lat ||
                        data?.location?.lat ||
                        data?.location?.latitude ||
                        data?.data?.location?.latitude ||
                        (data.loc ? data.loc.split(",")[0] : 0)
                    const lng =
                        data.longitude ||
                        data.lon ||
                        data?.location?.lng ||
                        data?.location?.longitude ||
                        data?.data?.location?.longitude ||
                        (data.loc ? data.loc.split(",")[1] : 0)
                    if (lat && lng) {
                        foundResults = true
                        if (firstCenter) {
                            map.flyTo({
                                center: [+lng, +lat],
                                zoom: 8,
                                speed: 1.5,
                                curve: 1.5
                            })
                            firstCenter = false
                        }
                        const el = document.createElement("div")
                        el.className = "custom-marker"
                        el.innerHTML = `
              <div class="flex flex-col items-center">
                <div class="w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
                <div class="w-0.5 h-6 bg-primary-500/50 -mt-1"></div>
                <div class="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center ring-4 ring-primary-500/20 animate-ping absolute opacity-75"></div>
                <div class="w-3 h-3 rounded-full bg-primary-500 absolute"></div>
              </div>
            `
                        new maplibregl.Marker(el)
                            .setLngLat([+lng, +lat])
                            .setPopup(
                                new maplibregl.Popup({ offset: 25, className: "custom-popup" })
                                    .setHTML(`
                    <div class="text-white">
                      <div class="font-bold text-primary-500">${api}</div>
                      <div class="text-sm opacity-70">Response: ${(
                                            tEnd - tStart
                                        ).toFixed(0)}ms</div>
                    </div>
                  `)
                            )
                            .addTo(map)
                        setResults((prev) => [
                            ...prev,
                            {
                                api,
                                data,
                                time: (tEnd - tStart).toFixed(0),
                                lat: +lat,
                                lng: +lng
                            }
                        ])
                    }
                } catch (err) {
                    console.error(`Error with ${api}:`, err)
                }
            }
            if (!foundResults) setError("No location data found for this IP address")
        } catch {
            setError("Failed to fetch location data. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col md:flex-row w-screen h-screen bg-black text-white overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary-500/20 blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-primary-500/10 blur-[100px]" />
                </div>
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="h-full w-full"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
                            backgroundSize: "30px 30px"
                        }}
                    />
                </div>
                <motion.div
                    className="absolute left-0 right-0 h-[40px] bg-gradient-to-b from-transparent via-primary-500/5 to-transparent pointer-events-none"
                    initial={{ top: "-10%" }}
                    animate={{ top: "110%" }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            </div>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full md:w-1/2 h-[50vh] md:h-full relative"
            >
                <div className="absolute inset-2 md:inset-4 bg-black/30 backdrop-blur-sm rounded-xl overflow-hidden border border-white/5 shadow-xl">
                    <div ref={mapContainer} className="w-full h-full" />
                    <div className="absolute top-3 left-3 flex items-center opacity-50">
                        <div className="h-4 w-4 border border-primary-500/50 flex items-center justify-center rounded-sm">
                            <div className="h-1.5 w-1.5 bg-primary-500/70" />
                        </div>
                        <div className="ml-2 h-px w-12 bg-gradient-to-r from-primary-500/70 to-transparent" />
                    </div>
                    <motion.div
                        className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-white/60 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        <div className="flex items-center">
                            <motion.div
                                className="h-1.5 w-1.5 rounded-full bg-primary-500"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                        <span>
                            {results.length ? `${results.length} locations` : "Map Ready"}
                        </span>
                    </motion.div>
                </div>
            </motion.div>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full md:w-1/2 p-4 overflow-hidden flex flex-col"
            >
                <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/5 p-4 md:p-6 shadow-xl h-full overflow-hidden flex flex-col">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="mb-6"
                    >
                        <h1 className="text-xl font-bold flex items-center">
                            <GlobeAltIcon className="h-5 w-5 mr-2 text-primary-500" />
                            IP Geolocation Tracker
                        </h1>
                        <p className="text-white/50 text-sm mt-1">
                            Track geographic locations of IP addresses using multiple APIs
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="mb-6"
                    >
                        <div className="flex gap-2 mb-1 items-center">
                            <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors duration-200">
                                    <MapPinIcon className="w-5 h-5" />
                                </div>
                                <input
                                    className="w-full pl-10 pr-4 py-3 bg-black/60 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-white placeholder-gray-500 transition-all"
                                    value={ip}
                                    onChange={(e) => setIp(e.target.value)}
                                    placeholder="IP Address"
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={loading}
                                onClick={handleFindLocation}
                                className="relative overflow-hidden py-3 px-4 bg-primary-500 text-white font-medium rounded-lg disabled:opacity-70 group"
                            >
                                <span className="relative z-10 flex items-center">
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                                            Find Location
                                        </>
                                    )}
                                </span>
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-500"
                                    initial={{ x: "100%" }}
                                    whileHover={{ x: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </motion.button>
                        </div>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                            >
                                <p className="text-center text-sm text-red-500">{error}</p>
                            </motion.div>
                        )}
                    </motion.div>
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-primary-500/20 scrollbar-track-white/5 pr-2">
                        {!results.length && !loading && !error ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-white/30 p-8"
                            >
                                <GlobeAltIcon className="h-16 w-16 mb-4 text-primary-500/20" />
                                <p className="text-center">
                                    Enter an IP address and click "Find Location" to see
                                    geolocation results
                                </p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {results.map((r, i) => {
                                    const { city, country, region } = getLocationInfo(r.data)
                                    const isExpanded = expandedCard === i

                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: i * 0.1 }}
                                            className="bg-gradient-to-br from-black to-black/60 backdrop-blur-md rounded-lg border border-white/5 overflow-hidden shadow-lg"
                                        >
                                            <div
                                                onClick={() => toggleCard(i)}
                                                className="relative cursor-pointer transition-all duration-300"
                                            >
                                                {/* Hover effect line */}
                                                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                                                    <div className={`absolute top-0 left-0 w-1 h-full bg-primary-500 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}></div>
                                                </div>

                                                <div className="flex items-center p-4">
                                                    <div className="h-10 w-10 rounded-full bg-primary-500/10 flex items-center justify-center mr-4 border border-primary-500/20">
                                                        <ServerIcon className="h-5 w-5 text-primary-500" />
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center">
                                                            <h3 className="font-bold text-white text-lg">{r.api}</h3>
                                                            <div className="flex items-center ml-2 px-2 py-0.5 bg-black/40 border border-primary-500/20 rounded-full">
                                                                <ClockIcon className="w-3 h-3 text-primary-500 mr-1" />
                                                                <span className="text-xs text-primary-500">{r.time}ms</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-sm text-white/60 mt-1">
                                                            {city && country ? (
                                                                <div className="flex items-center">
                                                                    <MapPinIcon className="w-3 h-3 mr-1" />
                                                                    <span>{[city, region, country].filter(Boolean).join(", ")}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-white/40">Data available</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center">
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                goToLocation(r.lat, r.lng)
                                                            }}
                                                            className="mr-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 hover:bg-primary-500/10 border border-white/10 hover:border-primary-500/20 transition-colors"
                                                        >
                                                            <MapPinIcon className="h-4 w-4 text-primary-500" />
                                                        </motion.button>

                                                        <motion.div
                                                            animate={{ rotate: isExpanded ? 90 : 0 }}
                                                            transition={{ duration: 0.3 }}
                                                            className="w-6 h-6 flex items-center justify-center"
                                                        >
                                                            <ChevronRightIcon className="h-5 w-5 text-white/40" />
                                                        </motion.div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable content */}
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{
                                                    height: isExpanded ? 'auto' : 0,
                                                    opacity: isExpanded ? 1 : 0
                                                }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 pt-0">
                                                    <div className="h-px w-full bg-gradient-to-r from-primary-500/20 via-white/5 to-transparent mb-4" />

                                                    <pre className="text-xs text-white/70 overflow-x-auto font-mono p-3 rounded bg-black/40 border border-white/5">
                                                        {JSON.stringify(r.data, null, 2)}
                                                    </pre>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-white/40"
                    >
                        <div>IP Geolocation Tracker</div>
                        <div className="flex items-center">
                            <motion.div
                                className="h-1.5 w-1.5 rounded-full bg-primary-500 mr-1"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            Live
                        </div>
                    </motion.div>
                </div>
            </motion.div>
            <style jsx global>{`
        .maplibregl-popup {
          z-index: 1;
        }
        .maplibregl-popup-content {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .maplibregl-popup-tip {
          border-top-color: rgba(0, 0, 0, 0.8) !important;
          border-bottom-color: rgba(0, 0, 0, 0.8) !important;
        }
        .maplibregl-popup-close-button {
          color: rgba(255, 255, 255, 0.5);
          font-size: 20px;
          padding: 0 6px;
        }
        .maplibregl-popup-close-button:hover {
          color: rgba(255, 255, 255, 0.8);
          background: transparent;
        }
        .maplibregl-ctrl-group {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          overflow: hidden;
        }
        .maplibregl-ctrl button {
          background-color: transparent !important;
        }
        .maplibregl-ctrl button:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .maplibregl-ctrl button span {
          filter: invert(1) opacity(0.7);
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.2);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 184, 166, 0.4);
        }
      `}</style>
        </div>
    )
}