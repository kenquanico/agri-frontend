import { useState, useRef, useCallback, useEffect } from 'react'

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
}

const DEFAULT_WHEP_PATH = '/drone/whep'

const normalizeBaseUrl = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    return `http://${raw}`
}

const resolveWhepUrl = (input) => {
    const normalized = normalizeBaseUrl(input)
    if (!normalized) return ''

    try {
        const url = new URL(normalized)
        const path = url.pathname || '/'
        if (path.endsWith('/whep') || path === DEFAULT_WHEP_PATH) {
            return url.toString()
        }
        if (path === '/' || path === '') {
            url.pathname = DEFAULT_WHEP_PATH
            return url.toString()
        }
        if (path.endsWith('/')) {
            url.pathname = `${path.slice(0, -1)}/whep`
            return url.toString()
        }
        url.pathname = `${path}/whep`
        return url.toString()
    } catch {
        return normalized
    }
}

export function useDroneWebRTC({ whepUrl = '' } = {}) {
    const [remoteStream, setRemoteStream] = useState(null)
    const [connectionState, setConnectionState] = useState('idle')
    const [error, setError] = useState(null)

    const pcRef = useRef(null)
    const sessionUrlRef = useRef('')

    const disconnect = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.ontrack = null
            pcRef.current.onconnectionstatechange = null
            pcRef.current.close()
            pcRef.current = null
        }
        sessionUrlRef.current = ''
        setRemoteStream(null)
        setConnectionState('idle')
        setError(null)
    }, [])

    const waitForIceComplete = (pc) =>
        new Promise((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve()
            } else {
                const checkState = () => {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState)
                        resolve()
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState)
                setTimeout(resolve, 2000)
            }
        })

    const connect = useCallback(async () => {
        if (pcRef.current) return

        const resolvedWhepUrl = resolveWhepUrl(whepUrl)
        if (!resolvedWhepUrl) {
            setConnectionState('failed')
            setError('Missing drone API URL. Please set the drone API/base URL first.')
            return
        }

        setConnectionState('connecting')
        setError(null)

        try {
            const pc = new RTCPeerConnection(RTC_CONFIG)
            pcRef.current = pc

            pc.addTransceiver('video', { direction: 'recvonly' })
            pc.addTransceiver('audio', { direction: 'recvonly' })

            pc.onconnectionstatechange = () => {
                setConnectionState(pc.connectionState)
                if (pc.connectionState === 'failed') {
                    setError('WebRTC connection failed. Check MediaMTX and RTMP stream.')
                }
            }

            pc.ontrack = (event) => {
                const stream = event.streams[0]
                setRemoteStream(stream)
            }

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            await waitForIceComplete(pc)

            const response = await fetch(resolvedWhepUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription.sdp,
            })

            if (!response.ok) {
                throw new Error(`WHEP server returned ${response.status}`)
            }

            // MediaMTX returns the session resource location for future ICE/control operations.
            const location = response.headers.get('location')
            if (location) {
                try {
                    sessionUrlRef.current = new URL(location, resolvedWhepUrl).toString()
                } catch {
                    sessionUrlRef.current = location
                }
            }

            const answerSdp = await response.text()
            await pc.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp,
            })

        } catch (err) {
            setError(err.message)
            setConnectionState('failed')
            disconnect()
        }
    }, [whepUrl, disconnect])

    useEffect(() => {
        return () => disconnect()
    }, [disconnect])

    return {
        remoteStream,
        connectionState,
        error,
        connect,
        disconnect,
    }
}