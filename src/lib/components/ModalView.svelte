<script lang="ts">
	import { currentModal } from "$lib/store"
	import { onDestroy, onMount } from "svelte"

	export let modal: HTMLDialogElement | null = null

	onMount(() => {
		if (!modal) return

		document.addEventListener("mousedown", (event) => {
			if (event.target !== modal) return

			const rect = (event.target as HTMLElement).getBoundingClientRect()

			if (
				rect.left > event.clientX ||
				rect.right < event.clientX ||
				rect.top > event.clientY ||
				rect.bottom < event.clientY
			) {
				modal?.close()
			}
		})

		modal.addEventListener("close", () => currentModal.reset())
	})

	onDestroy(() => modal?.close())

	$: $currentModal.component ? modal?.showModal() : modal?.close()
</script>

<dialog class="modal-dialog" {...$$restProps} aria-modal="true" bind:this={modal}>
	<svelte:component this={$currentModal.component} {...$currentModal.props} />
</dialog>

<style>
	dialog {
		margin: 5em auto;
		border: none;
		border-radius: 5px;
		padding: 0.5em;
		background-color: whitesmoke;
	}
	dialog::backdrop {
		pointer-events: all;
	}
</style>
