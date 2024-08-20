/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	return { feedId: params.id, articleIdx: parseInt(params.article) }
}
