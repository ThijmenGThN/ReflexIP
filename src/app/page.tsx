"use client"

import { useState, useEffect, useRef } from "react"
import JSONPretty from "react-json-pretty"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import "@/styles/json.css"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPinIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ClockIcon,
  ServerIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline"
import Image from "next/image"

interface ResultItem {
  api: string
  data: any
  time: string
  lat: number
  lng: number
}

import LogoRect from "@/assets/tp-white.png"

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
      style:
        "https://api.maptiler.com/maps/dataviz-dark/style.json?key=gB6P57S1Ofik49XFcLSa",
      center: [0, 45],
      zoom: 3,
      attributionControl: false
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
          "opacity-80",
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

  function toggleCard(index: number, lat: number, lng: number) {
    goToLocation(lat, lng)
    setExpandedCard(expandedCard === index ? null : index)
  }

  function getLocationInfo(data: any) {
    let city = data.city || data.location?.city || data.data?.location?.city || ""
    if (city && typeof city === "object") {
      city = ""
    }

    let country = data.country || data.location?.country || data.data?.location?.country || ""
    if (country && typeof country === "object") {
      country = ""
    }

    let region = data.region || data.location?.region || data.data?.location?.region || ""
    if (region && typeof region === "object") {
      region = ""
    }

    return { city, country, region }
  }

  function getISP(data: any) {
    if (typeof data.isp === "object" && data.isp !== null) {
      return data.isp.isp || data.isp.org || ""
    }
    return data.isp || data.org || data.as_org || data.organization || data.location?.org || ""
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
              <div class="relative -translate-x-1/2 -translate-y-full">
                <div class="absolute -bottom-1 left-1/2 w-3.5 h-0.5 bg-black/20 rounded-full -translate-x-1/2 blur-sm"></div>
                <div class="relative origin-bottom">
                  <div class="relative w-5 h-5 bg-primary-500 rounded-tl-full rounded-tr-full rounded-br-full -rotate-45 ring-2 ring-white/80">
                    <div class="absolute w-2 h-2 bg-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                  <div class="absolute w-0.5 h-2 bg-white/80 top-3.5 left-[9px] rotate-45"></div>
                </div>
              </div>
            `
            new maplibregl.Marker({ element: el })
              .setLngLat([+lng, +lat])
              .setPopup(
                new maplibregl.Popup({ offset: 25, className: "custom-popup" }).setHTML(`
                    <div class="text-white">
                      <div class="font-medium text-primary-500">${api}</div>
                      <div class="text-xs text-gray-400 mt-1">Response: ${(tEnd - tStart).toFixed(0)}ms</div>
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
    <div className="flex flex-col md:flex-row w-screen h-screen bg-black text-white overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>
        <div className="absolute inset-0">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "30px 30px"
            }}
          />
        </div>
        <div
          className="absolute top-0 right-0 w-[40%] h-[30%] opacity-5"
          style={{
            background: 'radial-gradient(circle at top right, rgba(20, 184, 166, 0.4), transparent 70%)',
            filter: 'blur(60px)'
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[30%] h-[20%] opacity-3"
          style={{
            background: 'radial-gradient(circle at bottom left, rgba(20, 184, 166, 0.4), transparent 70%)',
            filter: 'blur(50px)'
          }}
        />
        <motion.div
          className="absolute left-0 right-0 h-[40px] bg-gradient-to-b from-transparent via-primary-500/3 to-transparent pointer-events-none"
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
        className="w-full md:w-1/2 h-[50vh] md:h-full relative z-10"
      >
        <div className="absolute inset-4 md:inset-6 rounded-xl overflow-hidden shadow-xl bg-black/30 backdrop-blur-md border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-tr from-black to-black/60 z-10 pointer-events-none opacity-30" />
          <div className="absolute z-50 top-5 left-5 bg-black/70 backdrop-blur-sm px-2 py-1.5 border border-white/10 rounded-xl pointer-events-none shadow-lg">
            <Image src={LogoRect} alt="Logo" className="h-12 w-auto rounded-full" />
          </div>
          <div ref={mapContainer} className="w-full h-full relative z-0" />
          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black/40 to-transparent z-20 pointer-events-none backdrop-blur-[2px]" />
          <motion.div
            className="absolute bottom-5 left-5 flex items-center gap-2 text-xs font-medium text-gray-300 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm z-20 border border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-center">
              <motion.div
                className="h-2 w-2 rounded-full bg-primary-500"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <span>
              {results.length ? `${results.length} locations found` : "Locations"}
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full md:w-1/2 p-4 md:p-6 overflow-hidden flex flex-col z-10"
      >
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 shadow-xl h-full overflow-hidden flex flex-col border border-white/5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex">
              <div className="flex mt-1.5 mr-5 items-center justify-center h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-500">
                <GlobeAltIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold flex items-center text-white">
                  IP Geolocation Tracker
                </h1>
                <p className="text-gray-400 text-sm">
                  Find precise geographic locations for any IP address
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-6"
          >
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors duration-200">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-black/60 border border-white/10 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-white placeholder-gray-500 transition-all"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="Enter IP Address"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading}
                onClick={handleFindLocation}
                className="relative overflow-hidden py-3 px-5 bg-primary-500 text-white font-medium rounded-lg disabled:opacity-70 group shadow-lg shadow-primary-500/20"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <ArrowPathIcon className="animate-spin h-4 w-4" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="h-4 w-4" />
                      Locate
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
                transition={{ duration: 0.3 }}
                className="mt-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <p className="text-center text-sm text-red-500">{error}</p>
              </motion.div>
            )}
          </motion.div>

          <div className="flex-1 overflow-auto scrollbar-thin pr-2">
            {!results.length && !loading && !error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-gray-400 p-8"
              >
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-2 rounded-full bg-primary-500/10 border border-primary-500/20"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GlobeAltIcon className="h-10 w-10 text-primary-500" />
                  </div>
                </div>
                <p className="text-center text-sm max-w-xs">
                  Enter an IP address and click "Locate" to find its geographic location
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {results.map((r, i) => {
                    const { city, country, region } = getLocationInfo(r.data)
                    const isp = getISP(r.data)
                    const isExpanded = expandedCard === i

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        className="bg-black/60 backdrop-blur-md rounded-lg border border-white/5 overflow-hidden"
                      >
                        <div
                          onClick={() => toggleCard(i, r.lat, r.lng)}
                          className="relative cursor-pointer transition-all duration-300 hover:bg-white/5"
                        >
                          {/* Colored edge indicator */}
                          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                            <div
                              className={`absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-primary-400 to-primary-600 transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0"
                                }`}
                            ></div>
                          </div>

                          <div className="flex items-center p-4">
                            <div className="h-12 w-12 rounded-xl bg-primary-500/10 flex items-center justify-center mr-4 border border-primary-500/20">
                              <ServerIcon className="h-6 w-6 text-primary-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2">
                                <h3 className="font-semibold text-white text-base">
                                  {r.api}
                                </h3>
                                <div className="flex items-center px-2.5 py-1 bg-primary-500/10 text-primary-500 text-xs rounded-full font-medium border border-primary-500/20">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  {r.time}ms
                                </div>
                              </div>

                              <div className="text-sm text-gray-300 mt-1 truncate">
                                {city && country ? (
                                  <div className="flex items-center">
                                    <MapPinIcon className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-gray-400" />
                                    <span className="truncate">
                                      {[city, region, country].filter(Boolean).join(", ")}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-gray-500 text-xs">
                                    Location data available
                                  </div>
                                )}
                              </div>

                              {isp && (
                                <div className="text-xs text-gray-400 mt-1 truncate">
                                  <span className="text-gray-500">ISP:</span> {isp}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  goToLocation(r.lat, r.lng)
                                }}
                                className="mr-3 flex items-center justify-center w-9 h-9 rounded-lg bg-black/40 hover:bg-primary-500/10 border border-white/10 hover:border-primary-500/20 transition-colors"
                                title="Center on map"
                              >
                                <MapPinIcon className="h-4 w-4 text-primary-500" />
                              </motion.button>

                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.3 }}
                                className="w-6 h-6 flex items-center justify-center text-gray-400"
                              >
                                <ChevronRightIcon className="h-5 w-5" />
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        {/* Expandable content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0">
                                <div className="h-px w-full bg-white/5 mb-4" />

                                <div className="p-4 bg-black/60 overflow-x-auto border border-white/10 rounded-lg">
                                  <JSONPretty id="json-pretty" data={r.data}></JSONPretty>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-gray-500"
          >
            <div className="font-medium">IP Geolocation Tracker</div>
          </motion.div>
        </div>
      </motion.div>

      <style jsx global>{`
        .maplibregl-popup {
          z-index: 1;
        }
        .maplibregl-popup-content {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          color: white;
        }
        .maplibregl-popup-tip {
          border-top-color: rgba(0, 0, 0, 0.8) !important;
          border-bottom-color: rgba(0, 0, 0, 0.8) !important;
        }
        .maplibregl-popup-close-button {
          color: rgba(255, 255, 255, 0.6);
          font-size: 20px;
          padding: 0 6px;
        }
        .maplibregl-popup-close-button:hover {
          color: rgba(255, 255, 255, 0.9);
          background: transparent;
        }
        .maplibregl-ctrl-group {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        .maplibregl-ctrl button {
          background-color: transparent !important;
        }
        .maplibregl-ctrl button:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.2);
          border-radius: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 184, 166, 0.3);
        }
        .react-json-pretty {
          background: transparent !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .react-json-pretty .json-key {
          color: #14b8a6 !important;
        }
        .react-json-pretty .json-value {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .react-json-pretty .json-string {
          color: #e879f9 !important;
        }
        .react-json-pretty .json-boolean {
          color: #60a5fa !important;
        }
        .react-json-pretty .json-number {
          color: #f97316 !important;
        }
      `}</style>
    </div>
  )
}