<script lang="ts">
	import { goto } from "$app/navigation"
	import { findFeeds, type FeedLookupEntry } from "$lib/fetch"
	import { currentModal, currentAlerts, addSubscriptionFromLookup } from "$lib/store"
	import { MagnifyingGlass, CircleNotch } from "phosphor-svelte"
	import { readText } from "@tauri-apps/api/clipboard"
	import { onMount } from "svelte"

	interface FormState {
		url: string
		modalState: "initial" | "loading" | "found"
	}

	const state: FormState = {
		url: "",
		modalState: "initial"
	}

	let results: FeedLookupEntry[] = []

	async function doSearch() {
		state.modalState = "loading"

		try {
			results = await findFeeds(state.url)

			if (results.length === 0) {
				currentAlerts.add({
					type: "info",
					message: "No feeds were found for this website."
				})
			}
			state.modalState = results.length === 0 ? "initial" : "found"
		} catch (err) {
			currentAlerts.add({ type: "error", message: (err as Error).message })
			state.modalState = "initial"
		}
	}

	async function saveSubscriptions() {
		const selected = results.filter((entry) => entry.subscribe)

		currentModal.reset()

		// Convenience!
		if (selected.length === 1) {
			const id = await addSubscriptionFromLookup(selected[0])
			return await goto(`/feed/${id}`)
		}

		selected.forEach(addSubscriptionFromLookup)
	}

	onMount(async () => {
		const text = await readText()
		if (!text) return

		// Validate that there's an actual URL in the clipboard
		try {
			new URL(text)
		} catch (err) {
			return
		}

		state.url = text
	})
</script>

<form class="lookup-feed" on:submit|preventDefault={doSearch}>
	<!-- svelte-ignore a11y-autofocus -->
	<div class="input-box">
		<input type="url" bind:value={state.url} placeholder="Enter a URL" autofocus />

		<button type="submit" aria-label="Search for feeds" class="search-feeds-btn">
			{#if state.modalState === "loading"}
				<CircleNotch class="spinable" />
			{:else}
				<MagnifyingGlass />
			{/if}
		</button>
	</div>

	{#if state.modalState === "found" && results.length > 0}
		<section class="found-feeds">
			<ul class="feed-selection">
				{#each results as entry}
					<li>
						<input type="checkbox" bind:checked={entry.subscribe} />
						<input type="text" bind:value={entry.title} />

						<span>{entry.url}</span>
					</li>
				{/each}
			</ul>

			<button type="button" on:click={saveSubscriptions}>Subscribe</button>
		</section>
	{/if}
</form>

<style>
	:global(.modal-dialog) {
		padding: 0 !important;
		border-radius: 0 !important;
	}

	.lookup-feed {
		display: flex;
		flex-direction: column;
	}

	.lookup-feed input[type="url"] {
		min-width: 50vw;
		flex-grow: 1;
	}

	.input-box {
		display: flex;
	}

	.found-feeds {
		padding-inline: 1em;
		padding-bottom: 1em;
	}

	.found-feeds button {
		border-radius: 0;
	}

	.feed-selection {
		list-style: none;
		padding: 0;
		margin-bottom: 1em;
	}

	.feed-selection input[type="checkbox"] {
		font-size: 1.5rem;
	}
</style>
