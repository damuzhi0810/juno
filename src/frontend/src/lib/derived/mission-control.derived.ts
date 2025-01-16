import { missionControlIdUncertifiedStore } from '$lib/stores/mission-control.store';
import { derived } from 'svelte/store';

// TODO: find a better name but, I don't want to use missionControlId because it would clashes with the properties called missionControlId
export const missionControlIdDerived = derived(
	[missionControlIdUncertifiedStore],
	([$missionControlDataStore]) => $missionControlDataStore?.data
);
