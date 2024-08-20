import { writable } from "svelte/store"
import type { SvelteComponent } from "svelte"

import { BaseDirectory, readTextFile, removeFile, writeTextFile } from "@tauri-apps/api/fs"

import { parseFeed, type Feed } from "./feed"
import { fetchURL, type FeedLookupEntry } from "./fetch"

export interface Subscription {
	/** A UUID identifying this feed. This is how Mite tracks feeds within the application. */
	id: string

	/** The title of the feed. */
	title: string

	/** The URL pointing to this feed. */
	url: string

	/** The file where a copy of this feed is currently located. */
	readFrom: string

	/** Headers obtained from last fetch. Later used for conditional GET when polling. */
	lastFetch: {
		"Last-Modified": string
		ETag: string
	}
}

export interface Settings {
	/** Sidebar width expressed in CSS units. */
	sidebarWidth: string
	/** Whether to display the sidebar. */
	showSidebar: boolean
}

export interface Alert {
	/** The kind of alert (info, error, etc). */
	type: "info" | "success" | "error"
	/** The title of this alert. */
	title?: string
	/** The alert's message. */
	message: string
	/** Whether this alert can be closed by the user. */
	dismissible: boolean
	/** Amount of time in milliseconds for which the alert will be displayed. */
	timeout: number
}

interface AlertWithId extends Alert {
	id: string
}

export interface CurrentModal {
	component: typeof SvelteComponent<Record<string, unknown>> | null
	props?: Record<string, unknown>
}

/** Reads locally stored subscriptions. */
export async function readSubscriptions(): Promise<Subscription[]> {
	const log = await readTextFile("feeds.json", { dir: BaseDirectory.AppData })

	return JSON.parse(log)
}

/** Writes ``entries`` into the subscriptions/feeds file. */
export async function writeSubscriptions(entries: Subscription[]) {
	await writeTextFile("feeds.json", JSON.stringify(entries, null, 2), {
		dir: BaseDirectory.AppData
	})
}

/** Adds a subscription from a feed auto-discovery `entry`. */
export async function addSubscriptionFromLookup(entry: FeedLookupEntry): Promise<string> {
	const uuid = self.crypto.randomUUID()

	// If the feed's XML data has not yet been fetched
	if (!entry.xmlContent) {
		const response = await fetchURL(entry.url)

		entry.url = response.url
		entry.xmlContent = new DOMParser().parseFromString(response.data, "application/xml")
		entry.headers = response.headers
	}

	// Some normalization to make sure it's a valid filename
	const normalized = entry.title.toLowerCase().replace(/[^A-Za-z0-9]/g, "-")
	const filename = `${normalized}_${uuid.split("-")[0]}.xml`

	// Writes the subscription and its contents
	await addSubscription({
		id: uuid,
		title: entry.title,
		url: entry.url,
		readFrom: filename,
		lastFetch: {
			ETag: entry.headers?.["etag"] || "",
			"Last-Modified": entry.headers?.["last-modified"] || ""
		}
	})

	await writeTextFile(`contents/${filename}`, entry.xmlContent.documentElement.outerHTML, {
		dir: BaseDirectory.AppData
	})

	return uuid
}

/** Adds a new subscription to the store. */
export async function addSubscription(entry: Subscription) {
	const stored = await readSubscriptions()
	stored.push(entry)
	subscriptions.set(stored)

	await writeSubscriptions(stored)
}

/** Gets the contents of a feed from `entry`. */
export async function loadFeedContent(entry: Subscription): Promise<Feed> {
	const text = await readTextFile(`contents/${entry.readFrom}`, { dir: BaseDirectory.AppData })
	const feed = parseFeed(text)
	currentFeed.set(feed)

	return feed
}

/** Deletes the subscription and its contents. */
export async function removeSubscription(entry: Subscription): Promise<void> {
	// Delete the subscription from the feed
	const storedEntries = await readSubscriptions()

	const indexToRemove = storedEntries.findIndex((sub) => entry.id == sub.id)
	if (indexToRemove === -1) throw new Error("Could not find feed in file")

	storedEntries.splice(indexToRemove, 1)
	subscriptions.set(storedEntries)

	await writeSubscriptions(storedEntries)

	// Remove the contents file
	await removeFile(`contents/${entry.readFrom}`, { dir: BaseDirectory.AppData })
}

export const DEFAULT_SETTINGS: Settings = {
	sidebarWidth: "12rem",
	showSidebar: true
}

/** Loads settings file */
export async function readSettings(): Promise<Settings> {
	const config = await readTextFile("config.json", { dir: BaseDirectory.AppData })
	return { ...DEFAULT_SETTINGS, ...JSON.parse(config) }
}

export async function writeSettings(settings: Settings) {
	await writeTextFile(
		"config.json",
		JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }, null, 2),
		{ dir: BaseDirectory.AppData }
	)
}

export const subscriptions = writable<Subscription[]>(await readSubscriptions())
export const settings = writable<Settings>(await readSettings())
export const currentFeed = writable<Feed>()
export const currentModal = createModals()
export const currentAlerts = createAlerts()

function createModals() {
	const { subscribe, set } = writable<CurrentModal>({ component: null })

	return {
		subscribe,
		set,
		reset() {
			set({ component: null })
		}
	}
}

function createAlerts() {
	const { subscribe, update } = writable<AlertWithId[]>([])

	return {
		subscribe,
		dismiss: (id: string) => update((alerts) => alerts.filter((al) => al.id !== id)),
		add: (notify: Partial<Alert>) => {
			const defaults: AlertWithId = {
				id: crypto.randomUUID(),
				message: "",
				title: "",
				type: "info",
				dismissible: true,
				timeout: 5000
			}

			update((alerts) => {
				const idx = alerts.findIndex(
					(al) => al.message === notify.message && al.type === notify.type
				)
				if (idx === -1) return [{ ...defaults, ...notify }, ...alerts]
				else return alerts
			})

			const timeout = notify.timeout || defaults.timeout
			if (timeout && timeout > 0) {
				setTimeout(() => update((alerts) => alerts.filter((al) => al.id !== defaults.id)), timeout)
			}
		}
	}
}
