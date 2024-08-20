<script lang="ts">
	import { loadFeedContent, subscriptions, type Subscription } from "$lib/store"
	import { formatDate, absolutify } from "$lib/helpers"
	import sanitizeHtml from "sanitize-html"

	import { Calendar, User } from "phosphor-svelte"

	export let data

	let baseURL = ""

	$: subscription = $subscriptions.find((sub) => sub.id === data.feedId)

	async function readArticle(sub: Subscription, idx: number) {
		const feed = await loadFeedContent(sub)

		baseURL = feed.link || ""
		return feed.items[idx]
	}
</script>

{#await readArticle(subscription, data.articleIdx) then article}
	<main class="container">
		<h1>{article.title}</h1>

		<ul class="horizontal-list">
			{#if article.published}
				<li><Calendar /> {formatDate(article.published)}</li>
			{/if}

			{#each article.authors || [] as author}
				<li><User /> {author}</li>
			{/each}
		</ul>

		{#if article.summary}
			<p>{@html absolutify(sanitizeHtml(article.summary), baseURL)}</p>
		{/if}

		{#if article.content}
			<section class="feed-content">
				{@html absolutify(
					sanitizeHtml(article.content, {
						allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"]
					}),
					baseURL
				)}
			</section>
		{/if}
	</main>
{/await}
