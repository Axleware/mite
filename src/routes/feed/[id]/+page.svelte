<script lang="ts">
	import { goto } from "$app/navigation"
	import {
		currentAlerts,
		currentFeed,
		loadFeedContent,
		subscriptions,
		type Subscription
	} from "$lib/store"
	import { formatDate } from "$lib/helpers"
	import { pollFeed } from "$lib/fetch"
	import { parseFeed } from "$lib/feed"
	import { writeTextFile, BaseDirectory } from "@tauri-apps/api/fs"
	import { writeText } from "@tauri-apps/api/clipboard"
	import { Calendar, Link, User } from "phosphor-svelte"

	export let data

	$: subscription = $subscriptions.find((sub) => sub.id === data.id)

	async function fetchFeed(subscription: Subscription | undefined) {
		if (subscription === undefined) {
			currentAlerts.add({
				type: "error",
				message: "Feed deleted or unavailable"
			})

			return await goto("/")
		}

		try {
			await loadFeedContent(subscription)
		} catch (err) {
			currentAlerts.add({
				type: "error",
				message: (err as Error).message
			})

			return await goto("/")
		}
	}

	async function pollAndSave() {
		const response = await pollFeed(subscription!)
		if (response === null) {
			return currentAlerts.add({
				type: "info",
				message: "No new changes."
			})
		}

		const dom = new DOMParser().parseFromString(response.data, "application/xml")
		await writeTextFile(`contents/${subscription!.readFrom}`, dom.documentElement.outerHTML, {
			dir: BaseDirectory.AppData
		})

		currentFeed.set(parseFeed(response.data))

		currentAlerts.add({
			type: "success",
			message: "Polled successfully."
		})
	}

	async function copyFeedLink() {
		await writeText(subscription!.url)

		currentAlerts.add({
			type: "success",
			message: "Copied feed link."
		})
	}
</script>

<main class="container">
	{#await fetchFeed(subscription) then}
		<header>
			<h1>
				{#if $currentFeed.image}
					<img
						src={$currentFeed.image}
						alt={`Icon for ${$currentFeed.title}`}
						width="32"
						height="32"
					/>
				{/if}

				{$currentFeed.title}
			</h1>

			<div class="actions">
				<a class="ext-link" href={$currentFeed.link} target="_blank" rel="noopener noreferrer">
					<Link /> Read more
				</a>

				<button type="button" on:click={pollAndSave}> Poll </button>

				<button type="button" on:click={copyFeedLink}> Copy link </button>
			</div>
		</header>

		{#if $currentFeed.description}
			<p>{$currentFeed.description}</p>
		{/if}

		<section class="feed-items">
			{#each $currentFeed.items as item, idx}
				<article class="article">
					{#if item.image}
						<img
							class="thumbnail"
							src={item.image}
							loading="lazy"
							decoding="async"
							alt={item.summary || item.title}
						/>
					{/if}

					<div class="info">
						<div class="article-title">
							<a href={`/feed/${subscription.id}/${idx}`}>
								{item.title}
							</a>

							<a class="ext-link" href={item.link} target="_blank" rel="noopener noreferrer">
								<Link /> Read online
							</a>
						</div>

						<ul class="horizontal-list">
							{#if item.published}
								<li><Calendar /> {formatDate(item.published)}</li>
							{/if}
							{#each item.authors || [] as author}
								<li><User /> {author}</li>
							{/each}
						</ul>

						{#if item.summary}
							<p>{item.summary}</p>
						{/if}

						<ul class="horizontal-list categories">
							{#each item.categories || [] as category}
								<li>{category}</li>
							{/each}
						</ul>
					</div>
				</article>
			{/each}
		</section>
	{/await}
</main>

<style>
	.container {
		margin: 1em;
	}

	.container header {
		display: flex;
		gap: 1em;
		justify-content: space-between;
		align-items: center;
	}

	.container header h1 {
		display: flex;
		gap: 0.5em;
		align-items: center;
	}

	.container header h1 img {
		display: inline;
	}

	.container header .actions {
		display: flex;
		gap: 1em;
		align-items: center;
	}

	.feed-items {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}

	.categories li {
		background-color: hsl(0, 0%, 90%);
		padding: 0.2em 0.5em;
	}

	.article {
		padding: 1em;
		display: flex;
		gap: 1em;
		align-items: center;
		background-color: hsl(0, 0%, 96%);
	}

	.article-title {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.article .thumbnail {
		flex-grow: 1;
		flex-shrink: 0;
		flex-basis: 10vw;
		max-width: 10vw;
		max-height: 10vh;
		object-fit: cover;
	}

	.article .info {
		flex-grow: 999;
	}

	.ext-link {
		text-decoration: none;
		color: black;
		display: flex;
		gap: 0.5em;
		align-items: center;
	}

	.ext-link:hover {
		font-weight: bold;
	}

	:global(.ext-link svg) {
		display: inline;
	}
</style>
