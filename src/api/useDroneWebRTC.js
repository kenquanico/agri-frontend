import { useState, useRef, useCallback, useEffect } from 'react'

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
}

export function useDroneWebRTC({
                                   whepUrl = 'http://192.168.1.93:8889/drone/whep',
                               } = {}) {
    const [remoteStream, setRemoteStream] = useState(null)
    const [connectionState, setConnectionState] = useState('idle')
    const [error, setError] = useState(null)

    const pcRef = useRef(null)

    const disconnect = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.ontrack = null
            pcRef.current.onconnectionstatechange = null
            pcRef.current.close()
            pcRef.current = null
        }
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

            const response = await fetch(whepUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription.sdp,
            })

            if (!response.ok) {
                throw new Error(`WHEP server returned ${response.status}`)
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