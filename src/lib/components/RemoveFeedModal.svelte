<script lang="ts">
	import { goto } from "$app/navigation"
	import { removeSubscription, currentModal, type Subscription } from "$lib/store"

	async function deleteAndClose() {
		await removeSubscription(entry)
		currentModal.reset()

		await goto("/")
	}

	export let entry: Subscription
</script>

<section class="removal-dlg">
	<h2>Confirm removal</h2>

	<p>You are about to unsubscribe from <b>{entry.title}</b>. Are you sure?</p>

	<button on:click={deleteAndClose} class="delete-btn"> Yes, delete </button>

	<button on:click={currentModal.reset}> No, keep </button>
</section>

<style>
	.removal-dlg {
		margin: 1em;
	}
	.removal-dlg button {
		font-size: 1.05rem;
		padding: 0.15em 0.5em;
	}
	.delete-btn {
		background-color: var(--clr-error);
		color: white;
	}
	.delete-btn:hover,
	.delete-btn:focus {
		background-color: hsl(4, 90%, 50%);
	}
</style>
