use crate::db::store::{delete_collection_store, init_collection_store};
use crate::memory::STATE;
use crate::storage::store::assert_assets_collection_empty_store;
use junobuild_collections::store::{del_rule, filter_rules, set_rule};
use junobuild_collections::types::interface::{DelRule, SetRule};
use junobuild_collections::types::rules::{Memory, Rule};
use junobuild_shared::types::core::CollectionKey;

/// Rules

pub fn get_rules_db() -> Vec<(CollectionKey, Rule)> {
    STATE.with(|state| filter_rules(&state.borrow().heap.db.rules))
}

pub fn get_rules_storage() -> Vec<(CollectionKey, Rule)> {
    STATE.with(|state| filter_rules(&state.borrow().heap.storage.rules))
}

pub fn set_rule_db(collection: CollectionKey, rule: SetRule) -> Result<(), String> {
    STATE.with(|state| {
        set_rule(
            collection.clone(),
            rule.clone(),
            &mut state.borrow_mut().heap.db.rules,
        )
    })?;

    // If the collection does not exist yet we initialize it
    init_collection_store(&collection, &rule.memory.unwrap_or(Memory::Stable));

    Ok(())
}

pub fn set_rule_storage(collection: CollectionKey, rule: SetRule) -> Result<(), String> {
    STATE.with(|state| set_rule(collection, rule, &mut state.borrow_mut().heap.storage.rules))
}

pub fn del_rule_db(collection: CollectionKey, rule: DelRule) -> Result<(), String> {
    // We delete the empty collection first.
    delete_collection_store(&collection)?;

    STATE.with(|state| {
        del_rule(
            collection.clone(),
            rule,
            &mut state.borrow_mut().heap.db.rules,
        )
    })?;

    Ok(())
}

pub fn del_rule_storage(collection: CollectionKey, rule: DelRule) -> Result<(), String> {
    // Only unused rule can be removed
    assert_assets_collection_empty_store(&collection)?;

    STATE.with(|state| del_rule(collection, rule, &mut state.borrow_mut().heap.storage.rules))
}
