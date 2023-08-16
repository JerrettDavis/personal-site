import '../styles/global.css'
import 'highlight.js/styles/atom-one-dark-reasonable.css'
import { AppProps } from 'next/app'
import { Analytics } from '@vercel/analytics/react';
import Script from "next/script";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Component {...pageProps} />
            <Analytics />
            <Script src="https://www.googletagmanager.com/gtag/js?id=G-0MMCFXZ34X" />
            <Script id="google-analytics">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
         
                  gtag('config', 'G-0MMCFXZ34X');
                `}
            </Script>
        </>
    )
}
