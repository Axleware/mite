<script>
	import { getVersion } from "@tauri-apps/api/app"
</script>

<main>
	<h1>Nothing here (yet) 🏝️</h1>

	<p>Your subscriptions are listed aside. Click the Plus button above to add a new subscription.</p>

	<p>
		{#await getVersion() then version}
			You are using Mite Reader version {version}, maintained by Axleware and its contributors.
		{/await}

		<span>
			<b>This is alpha software</b>. If you find bugs, report them through our
			<a href="https://github.com/axleware/mite" target="_blank" rel="noopener noreferrer">
				Github page
			</a>.
		</span>
	</p>
</main>

<style>
	main {
		padding: 1em;
	}
</style>
