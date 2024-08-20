import { getDirectText } from "./helpers"

/* Root namespaces */
const ATOM_NS = "http://www.w3.org/2005/Atom"
const RSS1_NS = "http://purl.org/rss/1.0/"

/* Namespaces used within documents */
const CONTENT_NS = "http://purl.org/rss/1.0/modules/content/"
const DC_NS = "http://purl.org/dc/elements/1.1/"
const MEDIA_RSS_NS = "http://search.yahoo.com/mrss/"

/** Common image MIME types */
const IMAGE_MIMES = [
	"image/apng",
	"image/avif",
	"image/bmp",
	"image/gif",
	"image/vnd.microsoft.icon",
	"image/jpeg",
	"image/png",
	"image/svg+xml",
	"image/tiff",
	"image/webp"
]

export interface Feed {
	title: string
	link: string
	image?: string
	description?: string
	items: {
		title: string
		link: string
		image?: string
		published?: string
		authors?: string[]
		categories?: string[]
		summary?: string
		content?: string
	}[]
}

/** Checks if feed is an RSS 2.0 document */
export function isRSS(dom: Document): boolean {
	const root = dom.querySelector("rss")
	return root !== null && root.querySelector("channel") !== null && root.hasAttribute("version")
}

/** Checks if feed is an Atom document */
export function isAtom(dom: Document): boolean {
	const root = dom.querySelector("feed")
	return root !== null && root.namespaceURI === ATOM_NS
}

/** Checks if feed is an RSS 1.0 document */
export function isRDF(dom: Document): boolean {
	return dom.documentElement.getAttribute("xmlns") === RSS1_NS
}

/** Parses a feed from an `xml` string. */
export function parseFeed(xml: string): Feed {
	const dom = new DOMParser().parseFromString(xml, "application/xml")

	if (isRSS(dom)) {
		return parseRSSFeed(dom)
	} else if (isAtom(dom)) {
		return parseAtomFeed(dom)
	}

	if (isRDF(dom)) throw new Error("RSS 1.0 documents not supported.")

	throw new Error("Feed type unknown or unsupported.")
}

/** Parses the contents of an RSS item.
 *
 * It is common for RSS feeds to provide a description and/or the full content
 * of the article. If "content:encoded" is present, this is taken as the full content
 * and the description is used as a synopsis. If only "description" is present, this is
 * taken as the full content.
 */
export function parseRSSContent(item: Element) {
	const description = item.querySelector(":scope > description")
	const encoded = item.querySelector(":scope > encoded")

	if (encoded && encoded.namespaceURI === CONTENT_NS) {
		return {
			summary: description?.textContent || undefined,
			content: encoded.textContent || undefined
		}
	}

	return { summary: undefined, content: description?.textContent || undefined }
}

/** Parses the authors of a feed entry.
 *
 * Feeds may either use the root's corresponding "author" entry or the "dc:creator" entry.
 */
export function parseAuthors(item: Element) {
	// RSS and Atom
	const authors = Array.from(item.querySelectorAll(":scope > author"))

	// dc:creator
	const creators = Array.from(item.querySelectorAll(":scope > creator")).filter(
		(creator) => creator.namespaceURI === DC_NS
	)

	return [
		...creators.map((val) => val.textContent).filter((val) => val !== null),
		// RSS
		...authors.map(getDirectText).filter((val) => val !== null),
		// Atom
		// TODO: Atom also has the "contributor" element which is worth including
		// TODO: Atom also provides more details about a person like a URL or email.
		...authors
			.filter((val) => val.namespaceURI === ATOM_NS)
			.map((val) => val.querySelector(":scope > name")?.textContent || null)
			.filter((val) => val !== null)
	]
}

/** Parses the image for a feed entry.
 *
 * Feeds may either use the RSS "enclosure" entry or the "media:content" entry from Media RSS.
 */
export function parseImage(item: Element) {
	// RSS's enclosure
	const enclosure = item.querySelector(":scope > enclosure")
	if (enclosure && IMAGE_MIMES.includes(enclosure.getAttribute("type")!.toLowerCase())) {
		return enclosure.getAttribute("url")!
	}

	// Media RSS
	const mediaContent = item.querySelector(":scope > content")
	if (mediaContent?.namespaceURI === MEDIA_RSS_NS) {
		const type = mediaContent.getAttribute("type")
		const medium = mediaContent.getAttribute("medium")

		if (medium?.toLowerCase() === "image" || (type && IMAGE_MIMES.includes(type?.toLowerCase())))
			return mediaContent.getAttribute("url") || undefined
	}

	return undefined
}

/** Parses an RSS 2.0 document */
export function parseRSSFeed(dom: Document): Feed {
	const channel = dom.querySelector("rss > channel")!

	const items = Array.from(channel.querySelectorAll(":scope > item"))

	return {
		title: channel.querySelector(":scope > title")?.textContent || "",
		link: channel.querySelector(":scope > link")!.textContent!,
		image: channel.querySelector(":scope > image > url")?.textContent || undefined,
		description: channel.querySelector(":scope > description")?.textContent || undefined,
		items: items.map((item) => {
			const { summary, content } = parseRSSContent(item)
			const authors = parseAuthors(item)
			const categories = Array.from(item.querySelectorAll(":scope > category"))
				.map((category) => category.textContent)
				.filter((val) => val !== null)

			return {
				title: item.querySelector(":scope > title")?.textContent || "",
				link: item.querySelector(":scope > link")!.textContent!,
				image: parseImage(item),
				published: item.querySelector(":scope > pubDate")?.textContent || undefined,
				authors,
				categories,
				summary,
				content
			}
		})
	}
}

/** Parses an Atom document */
export function parseAtomFeed(dom: Document): Feed {
	const feed = dom.querySelector("feed")!

	const link =
		Array.from(feed.querySelectorAll(":scope > link"))
			.find(
				(link) =>
					link.namespaceURI === ATOM_NS && [null, "alternate"].includes(link.getAttribute("rel"))
			)
			?.getAttribute("href") || ""

	return {
		title: feed.querySelector(":scope > title")?.textContent || "",
		link,
		image: feed.querySelector(":scope > icon")?.textContent || "",
		description: feed.querySelector(":scope > summary")?.textContent || undefined,
		items: Array.from(feed.querySelectorAll(":scope > entry")).map((item) => {
			const authors = parseAuthors(item)

			const categories = Array.from(item.querySelectorAll(":scope > category"))
				.map((category) => category.getAttribute("name"))
				.filter((val) => val !== null)

			return {
				title: item.querySelector(":scope > title")?.textContent || "",
				link: item.querySelector(":scope > link")?.getAttribute("href") || "",
				image: parseImage(item),
				summary: item.querySelector(":scope > summary")?.textContent || undefined,
				content: item.querySelector(":scope > content")?.textContent || undefined,
				published: item.querySelector(":scope > published")?.textContent || undefined,
				authors,
				categories
			}
		})
	}
}
