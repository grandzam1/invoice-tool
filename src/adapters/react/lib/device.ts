import { useEffect, useState } from 'react';

export interface DeviceShellState {
    chrome: boolean;
    iphone: boolean;
    mobile: boolean;
    reduceMotion: boolean;
    reduceTransparency: boolean;
    standalone: boolean;
}

function detectDeviceShell(): DeviceShellState {
    if (typeof window === 'undefined') {
        return {
            chrome: false,
            iphone: false,
            mobile: false,
            reduceMotion: false,
            reduceTransparency: false,
            standalone: false,
        };
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isIPhone = /iPhone/.test(ua) && !/iPad/.test(ua);

    return {
        chrome: /Chrome\//.test(ua) && !/Edg\//.test(ua),
        iphone: isIPhone,
        mobile: isIOS || isAndroid,
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        reduceTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
    };
}

/** Data-* hooks for portal shell CSS. */
export function useDeviceShell(): DeviceShellState {
    const [state, setState] = useState(detectDeviceShell);

    useEffect(() => {
        setState(detectDeviceShell());

        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const transparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
        const standalone = window.matchMedia('(display-mode: standalone)');

        const refresh = () => setState(detectDeviceShell());

        motion.addEventListener('change', refresh);
        transparency.addEventListener('change', refresh);
        standalone.addEventListener('change', refresh);

        return () => {
            motion.removeEventListener('change', refresh);
            transparency.removeEventListener('change', refresh);
            standalone.removeEventListener('change', refresh);
        };
    }, []);

    return state;
}

export function deviceShellDataAttributes(state: DeviceShellState): Record<string, string> {
    return {
        'data-chrome': state.chrome ? 'true' : 'false',
        'data-iphone': state.iphone ? 'true' : 'false',
        'data-mobile': state.mobile ? 'true' : 'false',
        'data-reduce-motion': state.reduceMotion ? 'true' : 'false',
        'data-reduce-transparency': state.reduceTransparency ? 'true' : 'false',
        'data-standalone': state.standalone ? 'true' : 'false',
    };
}
