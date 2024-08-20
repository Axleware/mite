<script lang="ts">
	import { currentAlerts } from "$lib/store"
	import { fly } from "svelte/transition"
	import { X } from "phosphor-svelte"

	const themes = {
		info: "clr-info",
		success: "clr-success",
		error: "clr-error"
	}
</script>

<div class="alerts">
	{#each $currentAlerts as alert}
		<div
			class="alert"
			role="alert"
			transition:fly={{ x: 30 }}
			style={`background-color: var(--${themes[alert.type || "info"]})`}
		>
			{#if alert.title}
				<b class="alert-heading">{alert.title}</b>
			{/if}

			<span class="text">
				{alert.message}
			</span>

			{#if alert.dismissible}
				<button aria-label="Close alert" on:click={() => currentAlerts.dismiss(alert.id)}>
					<X />
				</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.alerts {
		position: fixed;
		z-index: 9999;
		right: 0;
		bottom: 0;

		margin: 0 auto;
		padding: 0;

		display: flex;
		flex-direction: column;
		justify-content: flex-start;
	}

	.alert {
		flex: 0 0 auto;
		margin: 0.75em;
		padding: 1em;
		color: white;
	}

	.text {
		display: inline;
	}
</style>
