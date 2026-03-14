import { ConvexPrivateService } from '$lib/services/convex';
import { Effect } from 'effect';
import { api } from '../../convex/_generated/api';
import { query } from '$app/server';

const demoRemote = Effect.gen(function* () {
	const convex = yield* ConvexPrivateService;

	const res = yield* convex.query({
		func: api.private.demo.privateDemoQuery,
		args: {
			username: 'test'
		}
	});

	return res;
}).pipe(Effect.provide(ConvexPrivateService.layer));

export const remoteDemoQuery = query(async () => {
	const res = await demoRemote.pipe(Effect.runPromise);

	return res;
});
