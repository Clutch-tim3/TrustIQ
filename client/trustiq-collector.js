(function() {
    'use strict';

    function generateFingerprint() {
        const fingerprint = {
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            cookie_enabled: navigator.cookieEnabled,
            canvas_hash: getCanvasHash(),
            webgl_hash: getWebGLHash(),
            audio_hash: getAudioHash(),
            installed_fonts_count: getInstalledFontsCount(),
            do_not_track: navigator.doNotTrack === '1',
            hardware_concurrency: navigator.hardwareConcurrency || 0,
            device_memory_gb: navigator.deviceMemory || 0,
            connection_type: getConnectionType(),
            has_webdriver: !!navigator.webdriver,
            has_phantom: window.callPhantom || window._phantom ? true : false,
            has_nightmare: window.__nightmare ? true : false,
            plugins_count: navigator.plugins.length
        };

        return fingerprint;
    }

    function getCanvasHash() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('canvas fingerprint', 2, 2);
            return sha256(canvas.toDataURL());
        } catch (error) {
            return 'canvas:unavailable';
        }
    }

    function getWebGLHash() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'webgl:unavailable';
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                return sha256(
                    gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) + 
                    gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                );
            }
            return 'webgl:no-renderer-info';
        } catch (error) {
            return 'webgl:unavailable';
        }
    }

    function getAudioHash() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            oscillator.connect(analyser);
            oscillator.start();
            const buffer = new Uint8Array(1024);
            analyser.getByteFrequencyData(buffer);
            oscillator.stop();
            return sha256(Array.from(buffer).join(''));
        } catch (error) {
            return 'audio:unavailable';
        }
    }

    function getInstalledFontsCount() {
        const testFonts = [
            'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia',
            'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
        ];
        
        return testFonts.length;
    }

    function getConnectionType() {
        if (navigator.connection) {
            return navigator.connection.effectiveType;
        }
        return 'unknown';
    }

    function sha256(str) {
        function utf8Encode(str) {
            const utf8 = [];
            for (let i = 0; i < str.length; i++) {
                let charCode = str.charCodeAt(i);
                if (charCode < 0x80) utf8.push(charCode);
                else if (charCode < 0x800) {
                    utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
                } else if (charCode < 0xd800 || charCode >= 0xe000) {
                    utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
                } else {
                    i++;
                    charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                    utf8.push(
                        0xf0 | (charCode >> 18),
                        0x80 | ((charCode >> 12) & 0x3f),
                        0x80 | ((charCode >> 6) & 0x3f),
                        0x80 | (charCode & 0x3f)
                    );
                }
            }
            return utf8;
        }

        function sha256Init() {
            return [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        }

        function sha256Block(hash, block) {
            const w = new Array(64);
            for (let i = 0; i < 16; i++) {
                w[i] = block.readInt32BE(i * 4);
            }
            for (let i = 16; i < 64; i++) {
                const s0 = ((w[i-15] >>> 7) | (w[i-15] << 25)) ^
                           ((w[i-15] >>> 18) | (w[i-15] << 14)) ^
                           (w[i-15] >>> 3);
                const s1 = ((w[i-2] >>> 17) | (w[i-2] << 15)) ^
                           ((w[i-2] >>> 19) | (w[i-2] << 13)) ^
                           (w[i-2] >>> 10);
                w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
            }

            let [a, b, c, d, e, f, g, h] = hash;

            for (let i = 0; i < 64; i++) {
                const S1 = ((e >>> 6) | (e << 26)) ^
                           ((e >>> 11) | (e << 21)) ^
                           ((e >>> 25) | (e << 7));
                const ch = (e & f) ^ (~e & g);
                const temp1 = (h + S1 + ch + sha256K[i] + w[i]) >>> 0;
                const S0 = ((a >>> 2) | (a << 30)) ^
                           ((a >>> 13) | (a << 19)) ^
                           ((a >>> 22) | (a << 10));
                const maj = (a & b) ^ (a & c) ^ (b & c);
                const temp2 = (S0 + maj) >>> 0;

                h = g;
                g = f;
                f = e;
                e = (d + temp1) >>> 0;
                d = c;
                c = b;
                b = a;
                a = (temp1 + temp2) >>> 0;
            }

            for (let i = 0; i < 8; i++) {
                hash[i] = (hash[i] + [a, b, c, d, e, f, g, h][i]) >>> 0;
            }
        }

        const sha256K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
            0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
            0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
            0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
            0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
            0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
            0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
            0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
            0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        const utf8Bytes = utf8Encode(str);
        const paddedLength = utf8Bytes.length + 1 + (8 - ((utf8Bytes.length + 1) % 64) % 64) + 8;
        const buffer = new ArrayBuffer(paddedLength);
        const view = new DataView(buffer);

        for (let i = 0; i < utf8Bytes.length; i++) {
            view.setUint8(i, utf8Bytes[i]);
        }
        view.setUint8(utf8Bytes.length, 0x80);

        const originalBitsLength = BigInt(utf8Bytes.length) * 8n;
        for (let i = 0; i < 8; i++) {
            view.setUint8(buffer.byteLength - 1 - i, Number((originalBitsLength >> BigInt(i * 8)) & 0xffn));
        }

        const blockView = new DataView(buffer);
        const hash = sha256Init();
        const blockCount = buffer.byteLength / 64;
        for (let i = 0; i < blockCount; i++) {
            sha256Block(hash, new DataView(buffer, i * 64, 64));
        }

        let hex = '';
        for (let i = 0; i < 8; i++) {
            hex += (hash[i] >>> 24 & 0xff).toString(16).padStart(2, '0') +
                  (hash[i] >>> 16 & 0xff).toString(16).padStart(2, '0') +
                  (hash[i] >>> 8 & 0xff).toString(16).padStart(2, '0') +
                  (hash[i] & 0xff).toString(16).padStart(2, '0');
        }

        return hex;
    }

    function collectBehavior() {
        let timeOnPage = 0;
        const interval = setInterval(() => {
            timeOnPage++;
        }, 1000);

        let mouseMovements = false;
        let keyboardEvents = false;
        let scrollEvents = 0;
        let copyPasteDetected = false;

        window.addEventListener('mousemove', () => {
            mouseMovements = true;
        }, { once: true });

        window.addEventListener('keydown', () => {
            keyboardEvents = true;
        }, { once: true });

        window.addEventListener('scroll', () => {
            scrollEvents++;
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName) {
                            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                                node.addEventListener('paste', () => {
                                    copyPasteDetected = true;
                                });
                            }
                            node.querySelectorAll('input, textarea').forEach(el => {
                                el.addEventListener('paste', () => {
                                    copyPasteDetected = true;
                                });
                            });
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            clearInterval(interval);
            observer.disconnect();
            return {
                time_on_page_seconds: timeOnPage,
                mouse_movements: mouseMovements,
                keyboard_events: keyboardEvents,
                scroll_events: scrollEvents,
                copy_paste_detected: copyPasteDetected
            };
        };
    }

    const behaviorCollector = collectBehavior();

    const TrustIQ = {
        collect: function(config) {
            const deviceFingerprint = generateFingerprint();
            const behavior = behaviorCollector();

            return {
                deviceFingerprint,
                behavior
            };
        },
        
        setApiKey: function(key) {
            if (typeof key === 'string') {
                window.trustiqApiKey = key;
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TrustIQ;
    } else if (typeof define === 'function' && define.amd) {
        define(function() {
            return TrustIQ;
        });
    } else {
        window.TrustIQ = TrustIQ;
    }

})();
