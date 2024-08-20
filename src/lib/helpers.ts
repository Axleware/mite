/** Returns a string of the combined text nodes of `element` ignoring any of its children */
export function getDirectText(element: Element): string | null {
	return (
		Array.from(element.childNodes)
			.filter((child) => child.nodeType === Node.TEXT_NODE)
			.map((child) => child.textContent)
			.join("")
			.trim() || null
	)
}

/** Formats ``dateString`` into a human-readable date string. */
export function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", { dateStyle: "full" })
}

/** Converts relative URLs to absolute URLs from `baseURL` in an `html` string. */
export function absolutify(html: string, baseURL: string): string {
	const dom = new DOMParser().parseFromString(html, "text/html")

	const base = dom.createElement("base")
	base.href = baseURL

	if (baseURL) dom.head.appendChild(base)

	dom.querySelectorAll("a, img").forEach((urled) => {
		if (urled instanceof HTMLAnchorElement) {
			if (baseURL) urled.href = new URL(urled.href, baseURL).toString()

			if (urled.target !== "_blank") {
				urled.target = "_blank"
				urled.rel = "noopener noreferrer"
			}
		} else if (urled instanceof HTMLImageElement && baseURL) {
			urled.src = new URL(urled.src, baseURL).toString()
		}
	})

	if (baseURL) dom.head.removeChild(base)

	return dom.documentElement.innerHTML
}
