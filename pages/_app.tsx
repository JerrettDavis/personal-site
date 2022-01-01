import '../styles/global.css'
import 'highlight.js/styles/atom-one-dark-reasonable.css'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />
}
