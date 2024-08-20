<script lang="ts">
	import type { HTMLLinkAttributes } from "svelte/elements"
	import { page } from "$app/stores"

	interface $$Props extends HTMLLinkAttributes {
		href: string
		exact?: boolean
	}

	export let href: string
	export let exact: boolean = false
</script>

<a
	{href}
	{...$$restProps}
	class:active={exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href)}
>
	<slot />
</a>
