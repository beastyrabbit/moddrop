import { CONVEX_API_KEY } from '$env/static/private';
import { ConvexHttpClient } from 'convex/browser';
import { Data, Layer, ServiceMap } from 'effect';
import * as Effect from 'effect/Effect';
import { CONVEX_URL } from './convex-env';
import type { DefaultFunctionArgs, FunctionReference } from 'convex/server';
import type { ArgsAndOptions, OptionalRestArgs } from 'convex/server';

class ConvexError extends Data.TaggedError('ConvexError')<{
	readonly message: string;
	readonly componentPath?: string;
}> {}

type PrivateQueryRunner = <
	Args extends DefaultFunctionArgs,
	Result,
	ComponentPath extends string | undefined
>(data: {
	func: FunctionReference<'query', 'public', Args, Result, ComponentPath>;
	args: Omit<Args, 'apiKey'>;
}) => Effect.Effect<Result, ConvexError>;

type PrivateMutationRunner = <
	Args extends DefaultFunctionArgs,
	Result,
	ComponentPath extends string | undefined
>(data: {
	func: FunctionReference<'mutation', 'public', Args, Result, ComponentPath>;
	args: Omit<Args, 'apiKey'>;
}) => Effect.Effect<Result, ConvexError>;

type PrivateActionRunner = <
	Args extends DefaultFunctionArgs,
	Result,
	ComponentPath extends string | undefined
>(data: {
	func: FunctionReference<'action', 'public', Args, Result, ComponentPath>;
	args: Omit<Args, 'apiKey'>;
}) => Effect.Effect<Result, ConvexError>;

interface ConvexPrivate {
	query: PrivateQueryRunner;
	mutation: PrivateMutationRunner;
	action: PrivateActionRunner;
}

export class ConvexPrivateService extends ServiceMap.Service<ConvexPrivateService, ConvexPrivate>()(
	'ConvexPrivateService'
) {
	static readonly layer = Layer.succeed(
		ConvexPrivateService,
		(() => {
			const convex = new ConvexHttpClient(CONVEX_URL);

			const withApiKey = <Args extends DefaultFunctionArgs>(args: Omit<Args, 'apiKey'>) =>
				({ ...args, apiKey: CONVEX_API_KEY }) as unknown as Args;

			const query: PrivateQueryRunner = ({ func, args }) =>
				Effect.tryPromise({
					try: () =>
						convex.query(func, ...([withApiKey(args)] as unknown as OptionalRestArgs<typeof func>)),
					catch: (error) =>
						new ConvexError({
							message: error instanceof Error ? error.message : String(error)
						})
				});

			const mutation: PrivateMutationRunner = ({ func, args }) =>
				Effect.tryPromise({
					try: () =>
						convex.mutation(
							func,
							...([withApiKey(args)] as unknown as ArgsAndOptions<
								typeof func,
								{ skipQueue: boolean }
							>)
						),
					catch: (error) =>
						new ConvexError({
							message: error instanceof Error ? error.message : String(error)
						})
				});

			const action: PrivateActionRunner = ({ func, args }) =>
				Effect.tryPromise({
					try: () =>
						convex.action(
							func,
							...([withApiKey(args)] as unknown as OptionalRestArgs<typeof func>)
						),
					catch: (error) =>
						new ConvexError({
							message: error instanceof Error ? error.message : String(error)
						})
				});

			return {
				query,
				mutation,
				action
			};
		})()
	);
}
