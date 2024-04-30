import type {
	_SERVICE as SatelliteActor_0_0_16,
	SetDoc as SetDoc0_0_16,
	SetRule as SetRule0_0_16
} from '$declarations/deprecated/satellite-0-0-16.did';
import { idlFactory as idlFactorSatellite_0_0_16 } from '$declarations/deprecated/satellite-0-0-16.factory.did';
import type {
	_SERVICE as SatelliteActor,
	SetDoc,
	SetRule
} from '$declarations/satellite/satellite.did';
import { idlFactory as idlFactorSatellite } from '$declarations/satellite/satellite.factory.did';
import type { Identity } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import type { Principal } from '@dfinity/principal';
import { fromNullable, toNullable } from '@dfinity/utils';
import { PocketIc, type Actor } from '@hadronous/pic';
import { toArray } from '@junobuild/utils';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, inject } from 'vitest';
import { NO_VERSION_ERROR_MSG } from './constants/satellite-tests.constants';
import {
	SATELLITE_WASM_PATH,
	controllersInitArgs,
	downloadSatellite
} from './utils/setup-tests.utils';

describe('satellite upgrade', () => {
	let pic: PocketIc;
	let actor: Actor<SatelliteActor_0_0_16>;
	let canisterId: Principal;

	const controller = Ed25519KeyIdentity.generate();

	afterEach(async () => {
		await pic?.tearDown();
	});

	const upgradeVersion = async (version: string) => {
		// Prevent Error: Canister lxzze-o7777-77777-aaaaa-cai is rate limited because it executed too many instructions in the previous install_code messages. Please retry installation after several minutes.
		for (let i = 0; i < 100; i++) {
			await pic.tick();
		}

		const destination = await downloadSatellite(version);

		await pic.upgradeCanister({
			canisterId,
			wasm: destination,
			sender: controller.getPrincipal()
		});
	};

	const upgrade = async () => {
		// Prevent Error: Canister lxzze-o7777-77777-aaaaa-cai is rate limited because it executed too many instructions in the previous install_code messages. Please retry installation after several minutes.
		for (let i = 0; i < 100; i++) {
			await pic.tick();
		}

		await pic.upgradeCanister({
			canisterId,
			wasm: SATELLITE_WASM_PATH,
			sender: controller.getPrincipal()
		});
	};

	const initUsers = async (): Promise<Identity[]> => {
		const { set_doc } = actor;

		const user1 = Ed25519KeyIdentity.generate();

		await set_doc('#user', user1.getPrincipal().toText(), {
			data: await toArray({
				provider: 'internet_identity'
			}),
			description: toNullable(),
			updated_at: toNullable()
		});

		const user2 = Ed25519KeyIdentity.generate();

		await set_doc('#user', user2.getPrincipal().toText(), {
			data: await toArray({
				provider: 'internet_identity'
			}),
			description: toNullable(),
			updated_at: toNullable()
		});

		return [user1, user2];
	};

	const testUsers = async (users: Identity[]) => {
		const { list_docs } = actor;

		const { items } = await list_docs('#user', {
			matcher: toNullable(),
			order: toNullable(),
			owner: toNullable(),
			paginate: toNullable()
		});

		expect(users).toHaveLength(users.length);

		for (const user of users) {
			expect(items.find(([key]) => key === user.getPrincipal().toText())).not.toBeUndefined();
		}
	};

	describe('v0.0.15 -> v0.0.16', async () => {
		beforeEach(async () => {
			pic = await PocketIc.create(inject('PIC_URL'));

			const destination = await downloadSatellite('0.0.15');

			const { actor: c, canisterId: cId } = await pic.setupCanister<SatelliteActor_0_0_16>({
				idlFactory: idlFactorSatellite_0_0_16,
				wasm: destination,
				arg: controllersInitArgs(controller),
				sender: controller.getPrincipal()
			});

			actor = c;
			canisterId = cId;
			actor.setIdentity(controller);
		});

		it('should add users after upgrade and still list all users from heap', async () => {
			await initUsers();

			const users = await initUsers();

			await testUsers(users);

			await upgradeVersion('0.0.16');

			const moreUsers = await initUsers();

			await testUsers([...users, ...moreUsers]);
		});

		it('should keep listing existing heap collections as such', async () => {
			const { set_rule, list_rules } = actor;

			await set_rule({ Db: null }, 'test', {
				memory: toNullable({ Heap: null }),
				updated_at: toNullable(),
				max_size: toNullable(),
				read: { Managed: null },
				mutable_permissions: toNullable(),
				write: { Managed: null },
				max_capacity: toNullable()
			});

			const testCollection = async () => {
				const [[collection, { memory }], _] = await list_rules({
					Db: null
				});

				expect(collection).toEqual('test');
				expect(memory).toEqual(toNullable({ Heap: null }));
			};

			await testCollection();

			await upgradeVersion('0.0.16');

			await testCollection();
		});
	});

	describe('v0.0.11 -> v0.0.17', async () => {
		beforeEach(async () => {
			pic = await PocketIc.create(inject('PIC_URL'));

			const destination = await downloadSatellite('0.0.11');

			const { actor: c, canisterId: cId } = await pic.setupCanister<SatelliteActor_0_0_16>({
				idlFactory: idlFactorSatellite_0_0_16,
				wasm: destination,
				arg: controllersInitArgs(controller),
				sender: controller.getPrincipal()
			});

			actor = c;
			canisterId = cId;
			actor.setIdentity(controller);
		});

		it(
			'should still list users from heap',
			async () => {
				await initUsers();

				const users = await initUsers();

				await testUsers(users);

				await upgradeVersion('0.0.12');

				await testUsers(users);

				await upgradeVersion('0.0.13');

				await testUsers(users);

				await upgradeVersion('0.0.14');

				await testUsers(users);

				await upgradeVersion('0.0.15');

				await testUsers(users);

				await upgradeVersion('0.0.16');

				await testUsers(users);

				await upgrade();

				await testUsers(users);
			},
			{ timeout: 600000 }
		);
	});

	describe('v0.0.16 -> v0.0.16', async () => {
		beforeEach(async () => {
			pic = await PocketIc.create(inject('PIC_URL'));

			const destination = await downloadSatellite('0.0.16');

			const { actor: c, canisterId: cId } = await pic.setupCanister<SatelliteActor_0_0_16>({
				idlFactory: idlFactorSatellite_0_0_16,
				wasm: destination,
				arg: controllersInitArgs(controller),
				sender: controller.getPrincipal()
			});

			actor = c;
			canisterId = cId;
			actor.setIdentity(controller);
		});

		it('should keep users', async () => {
			await initUsers();

			const users = await initUsers();

			await testUsers(users);

			await upgradeVersion('0.0.16');

			await testUsers(users);
		});
	});

	describe('v0.0.16 -> v0.0.17', async () => {
		beforeEach(async () => {
			pic = await PocketIc.create(inject('PIC_URL'));

			const destination = await downloadSatellite('0.0.16');

			const { actor: c, canisterId: cId } = await pic.setupCanister<SatelliteActor_0_0_16>({
				idlFactory: idlFactorSatellite_0_0_16,
				wasm: destination,
				arg: controllersInitArgs(controller),
				sender: controller.getPrincipal()
			});

			actor = c;
			canisterId = cId;
			actor.setIdentity(controller);
		});

		const setRule: SetRule0_0_16 = {
			memory: toNullable({ Stable: null }),
			max_size: toNullable(),
			max_capacity: toNullable(),
			read: { Managed: null },
			mutable_permissions: toNullable(true),
			write: { Managed: null },
			updated_at: toNullable()
		};

		describe('Rules', () => {
			let newActor: Actor<SatelliteActor>;

			beforeEach(async () => {
				const { set_rule: set_rule_deprecated } = actor as SatelliteActor_0_0_16;

				await set_rule_deprecated({ Db: null }, 'test', setRule);

				await upgrade();

				newActor = pic.createActor<SatelliteActor>(idlFactorSatellite, canisterId);
				newActor.setIdentity(controller);
			});

			it('should add version set to none to rules', async () => {
				const { list_rules } = newActor;

				const [[collection, { version }], _] = await list_rules({ Db: null });

				expect(collection).toEqual('test');
				expect(version).toEqual(toNullable());
			});

			it('should be able to update rule after upgrade', async () => {
				const { set_rule } = newActor;

				const setUpdateRule: SetRule = {
					...setRule,
					version: toNullable()
				};

				await expect(set_rule({ Db: null }, 'test', setUpdateRule)).resolves.not.toThrowError();
			});

			it('should be able to update rule after upgrade only once without version provided', async () => {
				const { set_rule: set_rule_deprecated } = actor as SatelliteActor_0_0_16;

				// We do not provide the version so it counts as a first set
				await set_rule_deprecated({ Db: null }, 'test', setRule);

				// We do not provide the version again so it should failed
				await expect(set_rule_deprecated({ Db: null }, 'test', setRule)).rejects.toThrow(
					NO_VERSION_ERROR_MSG
				);

				const { list_rules, set_rule } = newActor;

				const [[_, rule]] = await list_rules({ Db: null });

				expect(rule.version).toEqual(toNullable(1n));

				const setNewRule: SetRule = {
					...setRule,
					version: rule.version
				};

				// We do not provide the version so it counts as a first set
				await expect(set_rule({ Db: null }, 'test', setNewRule)).resolves.not.toThrowError();
			});
		});

		describe('Documents', async () => {
			const setDoc: SetDoc0_0_16 = {
				description: toNullable(),
				data: await toArray({
					hello: 'World'
				}),
				updated_at: toNullable()
			};

			const key = nanoid();
			const collection = 'test';

			let newActor: Actor<SatelliteActor>;

			beforeEach(async () => {
				const { set_rule: set_rule_deprecated } = actor as SatelliteActor_0_0_16;

				await set_rule_deprecated({ Db: null }, collection, setRule);

				const { set_doc: set_doc_deprecated } = actor as SatelliteActor_0_0_16;

				await set_doc_deprecated(collection, key, setDoc);

				await upgrade();

				newActor = pic.createActor<SatelliteActor>(idlFactorSatellite, canisterId);
				newActor.setIdentity(controller);
			});

			it('should add version set to none to doc', async () => {
				const { get_doc } = newActor;

				const doc = fromNullable(await get_doc(collection, key));

				expect(doc).not.toBeUndefined();
				expect(doc?.version).toEqual(toNullable());
			});

			it('should be able to update doc after upgrade', async () => {
				const { set_doc } = newActor;

				const setUpdateDoc: SetDoc = {
					...setDoc,
					version: toNullable()
				};

				await expect(set_doc(collection, key, setUpdateDoc)).resolves.not.toThrowError();
			});

			it('should be able to update doc after upgrade only once without version provided', async () => {
				const { set_doc: set_doc_deprecated } = actor as SatelliteActor_0_0_16;

				// We do not provide the version so it counts as a first set
				await set_doc_deprecated(collection, key, setDoc);

				// We do not provide the version again so it should failed
				await expect(set_doc_deprecated(collection, key, setDoc)).rejects.toThrow(
					NO_VERSION_ERROR_MSG
				);

				const { get_doc, set_doc } = newActor;

				const doc = fromNullable(await get_doc(collection, key));

				expect(doc).not.toBeUndefined();
				expect(doc!.version).toEqual(toNullable(1n));

				const setNewDoc: SetDoc = {
					...setDoc,
					version: doc!.version
				};

				// We do not provide the version so it counts as a first set
				await expect(set_doc(collection, key, setNewDoc)).resolves.not.toThrowError();
			});
		});
	});
});
