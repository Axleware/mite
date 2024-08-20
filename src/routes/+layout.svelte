<script lang="ts">
	import {
		currentFeed,
		currentModal,
		subscriptions,
		settings,
		writeSettings,
		DEFAULT_SETTINGS
	} from "$lib/store"

	import { page } from "$app/stores"
	import { onMount } from "svelte"

	import { ArrowLeft, ArrowRight, CaretDoubleLeft, List, Plus, Trash } from "phosphor-svelte"
	import AddFeedModal from "$lib/components/AddFeedModal.svelte"
	import AlertView from "$lib/components/AlertView.svelte"
	import NavLink from "$lib/components/NavLink.svelte"
	import ModalView from "$lib/components/ModalView.svelte"
	import RemoveFeedModal from "$lib/components/RemoveFeedModal.svelte"

	let dragging = false

	async function startDrag() {
		dragging = true

		document.body.addEventListener("mousemove", onDrag)
		document.body.addEventListener("mouseup", endDrag)
	}

	async function onDrag(event: MouseEvent) {
		if (dragging) {
			$settings.sidebarWidth = event.clientX + "px"
		} else {
			await endDrag()
		}
	}

	async function endDrag() {
		dragging = false

		document.body.removeEventListener("mousedown", onDrag)
		document.body.removeEventListener("mouseup", endDrag)

		await writeSettings($settings)
	}

	async function resetWidth() {
		$settings.sidebarWidth = DEFAULT_SETTINGS.sidebarWidth
		await writeSettings($settings)
	}

	function updateHeaderHeight() {
		const header = document.querySelector(".header")! as HTMLElement
		const content = document.querySelector(".content")! as HTMLElement

		const headerStyle = window.getComputedStyle(header)
		content.style.maxHeight = `calc(100% - ${headerStyle.height})`
	}

	window.addEventListener("resize", updateHeaderHeight)

	onMount(() => {
		updateHeaderHeight()
	})
</script>

<ModalView />
<AlertView />

<main class="wrapper">
	{#if $settings.showSidebar}
		<aside class="sidebar" style={`flex-basis: ${$settings.sidebarWidth}`}>
			<ul>
				<li class="sidebar-entry">
					<NavLink href="/" exact>Homepage</NavLink>
				</li>

				{#each $subscriptions as entry}
					<li class="sidebar-entry">
						<NavLink href={`/feed/${entry.id}`}>
							<span>{entry.title}</span>
						</NavLink>

						<button
							class="on-hover-btn"
							aria-label="Remove feed"
							on:click={() =>
								currentModal.set({
									component: RemoveFeedModal,
									props: { entry }
								})}
						>
							<Trash />
						</button>
					</li>
				{/each}
			</ul>
		</aside>

		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div
			class="splitter"
			role="separator"
			aria-orientation="vertical"
			on:dblclick={resetWidth}
			on:mousedown|preventDefault={startDrag}
		></div>
	{/if}

	<section class="content-wrap">
		<header class="header">
			<div class="actions">
				<button
					aria-label={$settings.showSidebar ? "Close sidebar" : "Open sidebar"}
					on:click={async () => {
						$settings.showSidebar = !$settings.showSidebar
						await writeSettings($settings)
					}}
				>
					{#if $settings.showSidebar}
						<CaretDoubleLeft />
					{:else}
						<List />
					{/if}
				</button>

				<button aria-label="Go back" on:click={() => history.back()}>
					<ArrowLeft />
				</button>

				<button aria-label="Go forward" on:click={() => history.forward()}>
					<ArrowRight />
				</button>
			</div>

			{#if $currentFeed && $page.params.article}
				<span>
					{$currentFeed.title} /
					{$currentFeed.items[parseInt($page.params.article)].title}
				</span>
			{:else if $currentFeed && $page.params.id}
				<span>{$currentFeed.title}</span>
			{:else}
				<span>(no feed)</span>
			{/if}

			<button
				aria-label="Add new feed"
				on:click={() => currentModal.set({ component: AddFeedModal })}
			>
				<Plus />
			</button>
		</header>

		<div class="content">
			<slot></slot>
		</div>
	</section>
</main>

<style>
	/** Root / base */
	:root {
		accent-color: #1055bf;
		--clr-error: #f44336;
		--clr-success: #3f8d43;
		--clr-info: #1055bf;
	}

	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		line-height: 1.5;
		font-family: "Merriweather Sans Variable", sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	:global(pre, code) {
		font-family: "Source Code Pro Variable", monospace;
	}

	:global(img, picture, video, canvas, svg) {
		display: block;
		max-width: 100%;
	}

	:global(input, button, textarea, select) {
		font: inherit;
	}

	:global(p, h1, h2, h3, h4, h5, h6) {
		overflow-wrap: break-word;
	}

	:global(a) {
		display: inline-block;
	}

	:global(button) {
		padding: 0.25em 0.5em;
		border: 1px solid lightgray;
		border-radius: 8px;
		background: hsl(0, 0%, 96%);
	}

	:global(button:hover) {
		background: hsl(0, 0%, 90%);
	}

	/* Global "components" */
	:global(.horizontal-list) {
		list-style: none;
		margin: 0;
		padding: 0;

		display: flex;
		flex-wrap: wrap;
		gap: 0.5em;
	}

	:global(.horizontal-list li svg) {
		display: inline;
	}

	:global(.spinable) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Layout */
	.wrapper {
		display: flex;
		height: 100vh;
	}

	.sidebar {
		background: lightgray;
	}

	.sidebar ul {
		list-style: none;
		padding-inline: 1em;
	}

	:global(.sidebar .sidebar-entry) {
		display: flex;
		padding: 0.25em;
		justify-content: space-between;
	}

	:global(.sidebar .sidebar-entry a) {
		flex-grow: 2;
		text-decoration: none;
		color: black;
	}

	.sidebar .sidebar-entry .on-hover-btn {
		display: none;

		font-size: 1rem;
		flex-shrink: 0;
		text-decoration: none;
		color: black;
	}

	.sidebar .sidebar-entry:hover .on-hover-btn {
		display: block;
	}

	.sidebar .sidebar-entry:hover,
	.sidebar .sidebar-entry:has(a.active) {
		background-color: #e4e4e4;
		font-weight: bold;
	}

	.splitter {
		flex-basis: 0.5rem;
		background: #e1e1e1;
		cursor: col-resize;
	}

	.splitter:hover {
		background: #e9e9e9;
	}

	.content-wrap {
		flex-basis: 0;
		flex-grow: 999;
		flex-direction: column;
	}

	.header {
		display: flex;
		flex-grow: 1;
		gap: 1em;
		justify-content: space-between;
		align-items: center;

		background-color: #e1e1e1;
		padding: 0.25em;
		text-align: center;
	}

	.header .actions {
		flex-shrink: 0;
	}

	.content {
		padding: 0 8vw;
		max-height: 100vh;
		overflow: auto;
	}
</style>
