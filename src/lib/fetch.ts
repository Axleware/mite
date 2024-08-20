import { fetch, Response, ResponseType } from "@tauri-apps/api/http"
import { isAtom, isRSS } from "./feed"
import type { Subscription } from "./store"

export const USER_AGENT = "axleware/mite-reader (github: axleware)"
export const FEED_MIMES = ["application/rss+xml", "application/atom+xml"]

export interface FeedLookupEntry {
	/** The title of the feed entry as seen in either the XML feed or HTML source */
	title: string
	/** The URL of the feed entry as seen in either the XML feed or HTML source */
	url: string
	/** Whether to subscribe to this feed */
	subscribe: boolean
	/** If this is an XML feed, the content of the XML feed */
	xmlContent?: Document
	/** The headers for the feed's response */
	headers?: Record<string, string>
}

/** Sends GET request to `url` */
export async function fetchURL(url: string): Promise<Response<string>> {
	const response = await fetch<string>(url, {
		method: "GET",
		headers: { "User-Agent": USER_AGENT },
		responseType: ResponseType.Text
	})

	if (!response.ok) throw new Error(`Could not fetch URL due to code ${response.status}`)

	return response
}

/** Performs feed auto-discovery on `url`.
 *
 * - If `url` points to a valid XML feed, returns a single entry containing the feed.
 * - If `url` points to an HTML website, traverses the website for any alternate links
 * that point to feeds and returns these entries.
 */
export async function findFeeds(url: string): Promise<FeedLookupEntry[]> {
	const response = await fetch<string>(url, {
		method: "GET",
		headers: { "User-Agent": USER_AGENT },
		responseType: ResponseType.Text
	})

	if (!response.ok) {
		let message: string
		if (response.status === 401) {
			message = "Feed requires authentication."
		} else if (response.status === 403) {
			message = "Feed request was forbidden."
		} else if (response.status === 404) {
			message = "No feed was found at the provided address."
		} else if (response.status === 429) {
			message = "Feed throttled or under rate limit. Wait and try again."
		} else {
			message = `Could not fetch feed because URL returned code ${response.status}`
		}

		throw new Error(message)
	}

	// If not text/html, this is probably a feed..
	// We trust that websites not serve feeds using the text/html media type.
	if (!response.headers["content-type"].startsWith("text/html")) {
		const dom = new DOMParser().parseFromString(response.data, "application/xml")

		let title = null
		if (isRSS(dom)) {
			title = dom.querySelector("rss > channel > title")?.textContent
		} else if (isAtom(dom)) {
			title = dom.querySelector("feed > title")?.textContent
		}

		return [
			{
				title: title?.trim() || "",
				url: response.url,
				subscribe: false,
				xmlContent: dom,
				headers: response.headers
			}
		]
	}

	const dom = new DOMParser().parseFromString(response.data, "text/html")

	// Injects a base URI to the DOM so that feeds have their appropriate URLs
	const base = dom.createElement("base")
	base.href = response.url
	dom.head.appendChild(base)

	const links = Array.from(
		dom.querySelectorAll(`head > link[rel="alternate"]`)
	) as HTMLLinkElement[]

	const feedLinks = links
		.filter((link) => FEED_MIMES.some((typ) => link.type.startsWith(typ)))
		.map((link) => ({ title: link.title, url: link.href, subscribe: false }))

	return feedLinks
}

/** Polls feed from `subscription`. Returns the response if new content is available,
 * otherwise returns null. */
export async function pollFeed(subscription: Subscription) {
	const response = await fetch<string>(subscription.url, {
		method: "GET",
		headers: {
			"User-Agent": USER_AGENT,
			"If-Modified-Since": subscription.lastFetch["Last-Modified"],
			"If-None-Match": subscription.lastFetch["ETag"]
		},
		responseType: ResponseType.Text
	})

	// Content does not need to be updated
	if (response.status === 304) return null

	if (!response.ok) throw new Error(`Could not fetch URL due to code ${response.status}`)

	return response
}
